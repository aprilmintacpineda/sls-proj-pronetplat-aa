const Contact = require('dependencies/models/Contact');
const ContactRequest = require('dependencies/models/ContactRequest');
const UserBlocking = require('dependencies/models/UserBlocking');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const {
  throwIfNotCompletedSetup
} = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ body, headers }) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid form body');

    const { data: authUser } = await jwt.verify(authToken);

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
