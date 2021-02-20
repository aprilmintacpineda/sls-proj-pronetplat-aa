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
  const contactRequest = new ContactRequest();

  try {
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      formBody.senderId,
      authUser.id
    );
  } catch (error) {
    console.log('error', error);
    return { statusCode: 400 };
  }

  await Promise.all([
    contactRequest.hardDelete(),
    createNotification({
      authUser,
      userId: contactRequest.data.senderId,
      type: 'contactRequestDeclined',
      body: '{fullname} has declined your contact request.',
      title: 'Contact request declined',
      category: 'notification'
    })
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
  formValidator: ({ senderId }) => validate(senderId, ['required'])
});
