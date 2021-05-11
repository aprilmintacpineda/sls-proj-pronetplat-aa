const {
  initClient,
  hardDeleteByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/notifications');

async function handler ({ authUser, params: { senderId } }) {
  const faunadb = initClient();

  try {
    await faunadb.query(
      hardDeleteByIndex(
        'contactRequestBySenderIdRecipientId',
        senderId,
        authUser.id
      )
    );
  } catch (error) {
    console.log('error', error);
    return { statusCode: 400 };
  }

  await createNotification({
    authUser,
    userId: senderId,
    type: 'contactRequestDeclined',
    body: '{fullname} has declined your contact request.',
    title: 'Contact request declined',
    category: 'notification'
  });

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
