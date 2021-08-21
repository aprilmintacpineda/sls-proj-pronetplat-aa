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
} = require('dependencies/utils/invokeLambda');

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
    recipientId: senderId,
    type: 'contactRequestDeclined',
    body: '{fullname} has declined your contact request.',
    title: 'Contact request declined'
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
