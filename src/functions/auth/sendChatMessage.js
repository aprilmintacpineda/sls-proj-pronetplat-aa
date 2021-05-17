const { initClient, create } = require('dependencies/utils/faunadb');
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

  const chatMessage = await faunadb.query(
    // @todo should not be able to send message if not previously contacted
    create('chatMessages', {
      senderId: authUser.id,
      recipientId: contactId,
      messageBody: formBody.messageBody
    })
  );

  await Promise.all([
    sendPushNotification({
      userId: contactId,
      title: 'New message from {fullname}',
      body: '{fullname} sent you a new chat message',
      authUser,
      data: {
        type: 'chatMessage',
        category: 'chatMessage'
      }
    }),
    sendWebSocketEvent({
      event: 'chatMessage',
      authUser,
      userId: contactId,
      payload: chatMessage
    })
  ]);

  return chatMessage;
}

module.exports.handler = httpGuard({
  handler,
  formValidator: ({ messageBody }) =>
    validate(messageBody, ['required', 'maxLength:3000']),
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
