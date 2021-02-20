const Contact = require('dependencies/models/Contact');
const ContactRequest = require('dependencies/models/ContactRequest');
const UserBlocking = require('dependencies/models/UserBlocking');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const { invokeEvent } = require('dependencies/utils/lambda');
const { hasCompletedSetup } = require('dependencies/utils/users');

module.exports.handler = async ({
  pathParameters: { contactId },
  headers
}) => {
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  let authUser;

  try {
    const token = await jwt.verify(headerValues.authToken);
    authUser = token.data;
  } catch (error) {
    console.log('invalid token');
    return { statusCode: 401 };
  }

  if (!hasCompletedSetup(authUser)) {
    console.log('Not yet setup');
    return { statusCode: 403 };
  }

  const contactBlocked = new UserBlocking();
  const blockedByUser = new UserBlocking();
  const receivedContactRequest = new ContactRequest();
  const sentContactRequest = new ContactRequest();
  const contact = new Contact();

  const [wasContactBlocked, wasBlockedByUser] = await Promise.all([
    contactBlocked.exists(
      'userBlockingsByBlockerIdUserId',
      authUser.id,
      contactId
    ),
    blockedByUser.exists(
      'userBlockingsByBlockerIdUserId',
      contactId,
      authUser.id
    ),
    receivedContactRequest.getPendingRequestIfExists({
      senderId: contactId,
      recipientId: authUser.id
    }),
    sentContactRequest.getPendingRequestIfExists({
      senderId: authUser.id,
      recipientId: contactId
    }),
    contact.getByIndexIfExists(
      'contactByOwnerContact',
      authUser.id,
      contactId
    )
  ]);

  if (
    wasContactBlocked ||
    wasBlockedByUser ||
    receivedContactRequest.instance ||
    sentContactRequest.instance
  ) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          contactBlocked: wasContactBlocked,
          blockedByUser: wasBlockedByUser,
          receivedContactRequest: receivedContactRequest.toResponseData(),
          sentContactRequest: sentContactRequest.toResponseData()
        }
      })
    };
  }

  if (!contact.instance) return { statusCode: 404 };

  await invokeEvent({
    functionName: process.env.fn_incrementNumTimesOpened,
    payload: {
      id: contact.data.id
    }
  });

  // @TODO: get contact details and send back
  return { statusCode: 403 };
};
