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

async function handler ({ authUser, params: { contactId } }) {
  const faunadb = initClient();

  await faunadb.query(
    hardDeleteByIndex(
      'contactRequestBySenderIdRecipientId',
      authUser.id,
      contactId
    )
  );

  await createNotification({
    authUser,
    recipientId: contactId,
    body: '{fullname} has cancelled {genderPossessiveLowercase} contact request.',
    title: 'Contact request cancelled',
    type: 'contactRequestCancelled'
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
