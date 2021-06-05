const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { invokeEvent } = require('dependencies/utils/lambda');

async function handler ({
  authUser,
  params: { contactId, nextToken }
}) {
  const faunadb = initClient();
  const nextTokenParts = nextToken
    ? decodeURIComponent(nextToken).split('_')
    : null;

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Union(
          query.Match(
            query.Index('contactChatMessages'),
            authUser.id,
            contactId
          ),
          query.Match(
            query.Index('contactChatMessages'),
            contactId,
            authUser.id
          )
        ),
        {
          size: 20,
          after: nextTokenParts
            ? [
                nextTokenParts[0],
                query.Ref(
                  query.Collection('chatMessages'),
                  nextTokenParts[1]
                ),
                query.Ref(
                  query.Collection('chatMessages'),
                  nextTokenParts[2]
                )
              ]
            : []
        }
      ),
      query.Lambda(
        ['createdAt', 'ref'],
        query.Let(
          {
            chatMessage: query.Get(query.Var('ref')),
            replyToMessageId: query.Select(
              ['data', 'replyToMessageId'],
              query.Var('chatMessage'),
              ''
            ),
            replyTo: query.If(
              query.Equals(query.Var('replyToMessageId'), ''),
              null,
              getById('chatMessages', query.Var('replyToMessageId'))
            )
          },
          {
            chatMessage: query.Var('chatMessage'),
            replyTo: query.Var('replyTo')
          }
        )
      )
    )
  );

  const unseenChatMessageIds = [];
  const data = [];

  console.log(JSON.stringify(result, null, 2));

  result.data.forEach(({ chatMessage: _chatMessage, replyTo }) => {
    const chatMessage = {
      ..._chatMessage.data,
      id: _chatMessage.ref.id,
      replyTo: {
        ...replyTo.data,
        id: replyTo.ref.id
      }
    };

    if (
      chatMessage.recipientId === authUser.id &&
      !chatMessage.seenAt
    )
      unseenChatMessageIds.push(chatMessage.id);

    data.push(chatMessage);
  });

  if (unseenChatMessageIds.length) {
    await invokeEvent({
      functionName: process.env.fn_markChatMessagesAsSeen,
      payload: {
        authUser,
        contactId,
        unseenChatMessageIds
      }
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      data,
      nextToken: result.after
        ? `${result.after[0]}_${result.after[1].id}_${result.after[2].id}`
        : null
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
