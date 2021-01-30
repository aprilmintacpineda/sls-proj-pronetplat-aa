const Contact = require('dependencies/nodejs/models/Contact');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const UserBlocking = require('dependencies/nodejs/models/UserBlocking');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');

module.exports.handler = async ({
  pathParameters: { contactId },
  headers
}) => {
  try {
    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    const contactBlocked = new UserBlocking();
    const blockedByUser = new UserBlocking();

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

    const contact = new Contact();

    if (
      !(await contact.exists(
        'contactByOwnerContact',
        authUser.id,
        contactId
      ))
    ) {
      const sentContactRequest = new ContactRequest();
      const receivedContactRequest = new ContactRequest();

      await Promise.all([
        sentContactRequest.getPendingRequestIfExists({
          senderId: authUser.id,
          recipientId: contactId
        }),
        receivedContactRequest.getPendingRequestIfExists({
          senderId: contactId,
          recipientId: authUser.id
        })
      ]);

      if (sentContactRequest.data) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            data: {
              sentContactRequest: sentContactRequest.toResponseData()
            }
          })
        };
      }

      if (receivedContactRequest.data) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            data: {
              receivedContactRequest: receivedContactRequest.toResponseData()
            }
          })
        };
      }

      return { statusCode: 404 };
    }

    // @TODO: get contact details and send back
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
