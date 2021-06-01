const { query } = require('faunadb');
const {
  initClient,
  create,
  existsByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  sendPushNotification
} = require('dependencies/utils/notifications');
const validate = require('dependencies/utils/validate');
const {
  sendWebSocketEvent
} = require('dependencies/utils/webSocket');

async function handler ({
  authUser,
  formBody,
  params: { contactId }
}) {
  if (authUser.id === contactId) return { statusCode: 400 };

  const faunadb = initClient();

  try {
    let chatMessage = await faunadb.query(
      query.If(
        existsByIndex(
          'contactByOwnerContact',
          contactId,
          authUser.id
        ),
        query.Let(
          {
            chatMessage: create('chatMessages', {
              senderId: authUser.id,
              recipientId: contactId,
              messageBody: formBody.messageBody
            })
          },
          query.Do(
            query.Call(
              'updateContactBadgeCount',
              contactId,
              authUser.id,
              'unreadChatMessagesFromContact',
              1
            ),
            query.Var('chatMessage')
          )
        ),
        query.Abort('NotInContact')
      )
    );

    chatMessage = {
      id: chatMessage.ref.id,
      ...chatMessage.data
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
        userId: contactId,
        payload: chatMessage
      })
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify(chatMessage)
    };
  } catch (error) {
    console.log('error', error);

    if (error.description === 'NotInContact')
      return { statusCode: 404 };

    return { statusCode: 400 };
  }
}

module.exports.handler = httpGuard({
  handler,
  formValidator: ({ messageBody }) =>
    validate(messageBody, ['required', 'maxLength:3000']),
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
