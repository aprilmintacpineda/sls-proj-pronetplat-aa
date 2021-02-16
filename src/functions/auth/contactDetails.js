const Contact = require('dependencies/nodejs/models/Contact');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const UserBlocking = require('dependencies/nodejs/models/UserBlocking');
const {
  checkRequiredHeaderValues
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const { invokeEvent } = require('dependencies/nodejs/utils/lambda');
const {
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');

module.exports.handler = async ({
  pathParameters: { contactId },
  headers
}) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);
    const { data: authUser } = await jwt.verify(authToken);

    throwIfNotCompletedSetup(authUser);

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

    if (wasContactBlocked) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: {
            contactBlocked: true
          }
        })
      };
    }

    if (wasBlockedByUser) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: {
            blockedByUser: true
          }
        })
      };
    }

    if (receivedContactRequest.instance) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: {
            receivedContactRequest: receivedContactRequest.toResponseData()
          }
        })
      };
    }

    if (sentContactRequest.instance) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: {
            sentContactRequest: sentContactRequest.toResponseData()
          }
        })
      };
    }

    if (contact.instance) {
      await invokeEvent({
        functionName: process.env.fn_incrementNumTimesOpened,
        payload: {
          id: contact.data.id
        }
      });

      // @TODO: get contact details and send back
      return { statusCode: 403 };
    }

    return { statusCode: 404 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
