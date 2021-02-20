const ContactRequest = require('dependencies/models/ContactRequest');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const {
  createNotification
} = require('dependencies/utils/notifications');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const sentContactRequest = new ContactRequest();

  try {
    await sentContactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      authUser.id,
      formBody.contactId
    );
  } catch (error) {
    console.log('error', error);
    return { statusCode: 400 };
  }

  await Promise.all([
    createNotification({
      authUser,
      userId: sentContactRequest.data.recipientId,
      type: 'contactRequestCancelled',
      body:
        '{fullname} has cancelled {genderPossessiveLowercase} contact request.',
      title: 'Contact request cancelled',
      category: 'notification'
    }),
    sentContactRequest.hardDelete()
  ]);

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
