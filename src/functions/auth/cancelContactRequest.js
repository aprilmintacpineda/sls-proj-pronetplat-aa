const {
  initClient,
  hardDeleteByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const {
  createNotification
} = require('dependencies/utils/notifications');

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
    userId: contactId,
    body:
      '{fullname} has cancelled {genderPossessiveLowercase} contact request.',
    title: 'Contact request cancelled',
    category: 'notification',
    type: 'contactRequestCancelled'
  });

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ]
});
