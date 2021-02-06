const Contact = require('dependencies/nodejs/models/Contact');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const UserBlocking = require('dependencies/nodejs/models/UserBlocking');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ body, headers }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid form body');

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    throwIfNotCompletedSetup(authUser);

    const userBlocking = new UserBlocking();
    const contactRequest = new ContactRequest();

    const [
      userHasBlockContact,
      contactHasBlockedUser,
      hasReceivedContactRequest,
      hasSentContactRequest
    ] = await Promise.all([
      userBlocking.wasBlocked(authUser.id, formBody.contactId),
      userBlocking.wasBlocked(formBody.contactId, authUser.id),
      contactRequest.hasPendingRequest({
        senderId: formBody.contactId,
        recipientId: authUser.id
      }),
      contactRequest.hasPendingRequest({
        senderId: authUser.id,
        recipientId: formBody.contactId
      })
    ]);

    if (userHasBlockContact) throw new Error('userHasBlockContact');
    if (contactHasBlockedUser)
      throw new Error('contactHasBlockedUser');
    if (hasReceivedContactRequest)
      throw new Error('hasReceivedContactRequest');
    if (hasSentContactRequest)
      throw new Error('hasSentContactRequest');

    const contact = new Contact();

    await Promise.all([
      userBlocking.create({
        blockerId: authUser.id,
        userId: formBody.contactId
      }),
      contact.hardDeleteIfExists(
        'contactByOwnerContact',
        authUser.id,
        formBody.contactId
      )
    ]);

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
