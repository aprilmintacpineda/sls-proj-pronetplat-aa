const { query } = require('faunadb');
const {
  initClient,
  getById,
  update,
  selectRef
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  sendWebSocketEvent
} = require('dependencies/utils/webSocket');

async function handler ({ authUser, params: { chatMessageId } }) {
  const faunadb = initClient();

  let chatMessage = null;

  try {
    chatMessage = await faunadb.query(
      query.Let(
        {
          chatMessage: getById('chatMessages', chatMessageId)
        },
        query.If(
          query.Equals(
            query.Select(
              ['data', 'recipientId'],
              query.Var('chatMessage')
            ),
            authUser.id
          ),
          update(selectRef(query.Var('chatMessage')), {
            seenAt: query.Format('%t', query.Now())
          }),
          query.Abort('AuthUserNotRecipient')
        )
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'AuthUserNotRecipient')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  chatMessage = {
    ...chatMessage.data,
    id: chatMessage.ref.id
  };

  await sendWebSocketEvent({
    type: 'chatMessageSeen',
    authUser,
    userId: chatMessage.senderId,
    payload: {
      unseenChatMessageIds: [chatMessage]
    }
  });

  return chatMessage;
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
