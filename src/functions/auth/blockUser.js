const Contact = require('dependencies/models/Contact');
const ContactRequest = require('dependencies/models/ContactRequest');
const User = require('dependencies/models/User');
const UserBlocking = require('dependencies/models/UserBlocking');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const { hasCompletedSetup } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ body, headers }) => {
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) {
    console.log('Invalid form body');
    return { statusCode: 400 };
  }

  let authUser;

  try {
    const token = await jwt.verify(headerValues.authToken);
    authUser = token.data;
  } catch (_1) {
    console.log('invalid token');
    return { statusCode: 401 };
  }

  if (!hasCompletedSetup(authUser)) {
    console.log('Not yet setup');
    return { statusCode: 403 };
  }

  const userBlocking = new UserBlocking();
  const contactRequest = new ContactRequest();
  const targetUser = new User();

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
    }),
    targetUser.getById(formBody.contactId)
  ]);

  const targetHasCompletedSetup = !hasCompletedSetup(
    targetUser.data
  );

  if (
    userHasBlockContact ||
    contactHasBlockedUser ||
    hasReceivedContactRequest ||
    hasSentContactRequest ||
    !targetHasCompletedSetup
  ) {
    console.log('userHasBlockContact', userHasBlockContact);
    console.log('contactHasBlockedUser', contactHasBlockedUser);
    console.log(
      'hasReceivedContactRequest',
      hasReceivedContactRequest
    );
    console.log('hasSentContactRequest', hasSentContactRequest);
    console.log('targetHasCompletedSetup', targetHasCompletedSetup);

    return { statusCode: 400 };
  }

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
};
