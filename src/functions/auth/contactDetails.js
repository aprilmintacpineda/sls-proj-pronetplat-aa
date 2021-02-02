const { query } = require('faunadb');
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

    const receivedContactRequest = new ContactRequest();

    await receivedContactRequest.getPendingRequestIfExists({
      senderId: contactId,
      recipientId: authUser.id
    });

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

    const contact = new Contact();
    await contact.getByIndexIfExists(
      'contactByOwnerContact',
      authUser.id,
      contactId
    );

    if (!contact.instance) {
      const sentContactRequest = new ContactRequest();

      await sentContactRequest.getPendingRequestIfExists({
        senderId: authUser.id,
        recipientId: contactId
      });

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

      return { statusCode: 404 };
    }

    await contact.update({
      lastOpenedAt: query.Format('%t', query.Now())
    });

    // @TODO: get contact details and send back
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
