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
          query.Let(
            {
              updatedChatMessage: update(
                selectRef(query.Var('chatMessage')),
                {
                  seenAt: query.Format('%t', query.Now())
                }
              )
            },
            query.Do(
              query.Call(
                'updateContactBadgeCount',
                authUser.id,
                query.Select(
                  ['data', 'senderId'],
                  query.Var('chatMessage')
                ),
                'unreadChatMessagesFromContact',
                -1
              ),
              query.Call(
                'updateOrCreateUserInbox',
                authUser.id,
                query.Select(
                  ['data', 'senderId'],
                  query.Var('updatedChatMessage')
                ),
                '',
                -1
              ),
              query.Var('updatedChatMessage')
            )
          ),
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

  await sendWebSocketEvent({
    type: 'chatMessageSeen',
    authUser,
    userId: chatMessage.data.senderId,
    payload: {
      unseenChatMessageIds: [chatMessage.ref.id],
      seenAt: chatMessage.data.seenAt
    }
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
