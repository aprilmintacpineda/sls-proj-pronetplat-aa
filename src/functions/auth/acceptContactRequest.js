const Contact = require('dependencies/models/Contact');
const ContactRequest = require('dependencies/models/ContactRequest');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const {
  createNotification
} = require('dependencies/utils/notifications');
const { hasCompletedSetup } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

function hasErrors ({ senderId }) {
  return validate(senderId, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('invalid headers');
    return { statusCode: 405 };
  }

  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) {
    console.log('invalid form body');
    return { statusCode: 405 };
  }

  let authUser;

  try {
    const token = await jwt.verify(headerValues.authToken);
    authUser = token.data;
  } catch (_1) {
    console.log('Invalid token');
    return { statusCode: 401 };
  }

  if (!hasCompletedSetup(authUser)) {
    console.log('Not yet completed setup');
    return { statusCode: 403 };
  }

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
};
