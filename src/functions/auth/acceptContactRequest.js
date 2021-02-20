const Contact = require('dependencies/models/Contact');
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

  const contact = new Contact();

  await Promise.all([
    contact.createIfNotExists({
      index: 'contactByOwnerContact',
      args: [authUser.id, contactRequest.data.senderId],
      data: {
        ownerId: authUser.id,
        contactId: contactRequest.data.senderId,
        numTimesOpened: 0
      }
    }),
    contact.createIfNotExists({
      index: 'contactByOwnerContact',
      args: [contactRequest.data.senderId, authUser.id],
      data: {
        ownerId: contactRequest.data.senderId,
        contactId: authUser.id,
        numTimesOpened: 0
      }
    }),
    createNotification({
      authUser,
      userId: contactRequest.data.senderId,
      type: 'contactRequestAccepted',
      body: '{fullname} has accepted your contact request.',
      title: 'Contact request accepted',
      category: 'notification'
    }),
    contactRequest.hardDelete()
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
