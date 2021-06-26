const { query } = require('faunadb');
const {
  initClient,
  create,
  existsByIndex,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  sendWebSocketEvent,
  sendPushNotification
} = require('dependencies/utils/invokeLambda');
const validate = require('dependencies/utils/validate');

async function handler ({
  authUser,
  formBody,
  params: { contactId }
}) {
  if (authUser.id === contactId) return { statusCode: 400 };

  const faunadb = initClient();
  let chatMessage = null;

  try {
    chatMessage = await faunadb.query(
      query.If(
        !formBody.replyToMessageId
          ? existsByIndex(
              'contactByOwnerContact',
              contactId,
              authUser.id
            )
          : query.And(
              existsByIndex(
                'contactByOwnerContact',
                contactId,
                authUser.id
              ),
              query.Let(
                {
                  replyTo: getById(
                    'chatMessages',
                    formBody.replyToMessageId
                  )
                },
                query.Or(
                  query.And(
                    query.Equals(
                      query.Select(
                        ['data', 'recipientId'],
                        query.Var('replyTo')
                      ),
                      authUser.id
                    ),
                    query.Equals(
                      query.Select(
                        ['data', 'senderId'],
                        query.Var('replyTo')
                      ),
                      contactId
                    )
                  ),
                  query.And(
                    query.Equals(
                      query.Select(
                        ['data', 'recipientId'],
                        query.Var('replyTo')
                      ),
                      contactId
                    ),
                    query.Equals(
                      query.Select(
                        ['data', 'senderId'],
                        query.Var('replyTo')
                      ),
                      authUser.id
                    )
                  )
                )
              )
            ),
        query.Let(
          {
            chatMessage: create('chatMessages', {
              senderId: authUser.id,
              recipientId: contactId,
              messageBody: formBody.messageBody,
              replyToMessageId: formBody.replyToMessageId || null
            }),
            replyTo: formBody.replyToMessageId
              ? getById('chatMessages', formBody.replyToMessageId)
              : null
          },
          query.Do(
            query.Call(
              'updateOrCreateUserInbox',
              authUser.id,
              contactId,
              query.Select(['ref', 'id'], query.Var('chatMessage')),
              0
            ),
            query.Call(
              'updateOrCreateUserInbox',
              contactId,
              authUser.id,
              query.Select(['ref', 'id'], query.Var('chatMessage')),
              1
            ),
            query.Call(
              'updateContactBadgeCount',
              contactId,
              authUser.id,
              'unreadChatMessagesFromContact',
              1
            ),
            query.Call(
              'updateUserBadgeCount',
              contactId,
              'unreadChatMessagesCount',
              1
            ),
            {
              chatMessage: query.Var('chatMessage'),
              replyTo: query.Var('replyTo')
            }
          )
        ),
        query.Abort('ValidationError')
      )
    );
  } catch (error) {
    console.log('error', error);

    if (error.description === 'ValidationError')
      return { statusCode: 404 };

    return { statusCode: 400 };
  }

  chatMessage = {
    id: chatMessage.chatMessage.ref.id,
    ...chatMessage.chatMessage.data,
    replyTo: chatMessage.replyTo
      ? {
          ...chatMessage.replyTo.data,
          id: chatMessage.replyTo.ref.id
        }
      : null
  };

  await Promise.all([
    sendPushNotification({
      userId: contactId,
      title: 'New message from {fullname}',
      body: '{fullname} sent you a message',
      authUser
    }),
    sendWebSocketEvent({
      type: 'chatMessageReceived',
      authUser,
      isConnected: true,
      userId: contactId,
      payload: chatMessage
    })
  ]);

  return {
    statusCode: 200,
    body: JSON.stringify(chatMessage)
  };
}

module.exports = httpGuard({
  handler,
  formValidator: ({ messageBody }) =>
    validate(messageBody, ['required', 'maxLength:3000']),
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
