const { query } = require('faunadb');
const Contact = require('dependencies/nodejs/models/Contact');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  createNotification
} = require('dependencies/nodejs/utils/notifications');
const {
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ senderId }) {
  return validate(senderId, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid form body');

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    throwIfNotCompletedSetup(authUser);

    const contactRequest = new ContactRequest();
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      formBody.senderId,
      authUser.id
    );

    const contact = new Contact();

    await Promise.all([
      contact.createIfNotExists({
        index: 'contactByOwnerContact',
        args: [authUser.id, contactRequest.data.senderId],
        data: {
          ownerId: authUser.id,
          contactId: contactRequest.data.senderId,
          lastOpenedAt: query.Format('%t', query.Now())
        }
      }),
      contact.createIfNotExists({
        index: 'contactByOwnerContact',
        args: [contactRequest.data.senderId, authUser.id],
        data: {
          ownerId: contactRequest.data.senderId,
          contactId: authUser.id,
          lastOpenedAt: query.Format('%t', query.Now())
        }
      })
    ]);

    await Promise.all([
      contactRequest.hardDelete(),
      createNotification({
        authUser,
        userId: contactRequest.data.senderId,
        type: 'contactRequestAccepted',
        body: '{fullname} has accepted your contact request.',
        title: 'Contact request accepted',
        category: 'notification'
      })
    ]);

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
