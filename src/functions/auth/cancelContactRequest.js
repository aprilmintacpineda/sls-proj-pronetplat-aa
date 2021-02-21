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
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const faunadb = initClient();

  const contactRequest = await faunadb.query(
    hardDeleteByIndex(
      'contactRequestBySenderIdRecipientId',
      authUser.id,
      formBody.contactId
    )
  );

  await createNotification({
    authUser,
    userId: contactRequest.data.recipientId,
    type: 'contactRequestCancelled',
    body:
      '{fullname} has cancelled {genderPossessiveLowercase} contact request.',
    title: 'Contact request cancelled',
    category: 'notification'
  });

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
