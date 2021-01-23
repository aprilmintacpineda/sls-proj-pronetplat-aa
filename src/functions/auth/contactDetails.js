const Contact = require('dependencies/nodejs/models/Contact');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
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

    const contact = new Contact();
    const contactRequest = new ContactRequest();

    if (!(await contact.isInContact(authUser.id, contactId))) {
      await contactRequest.getPendingRequestIfExists({
        senderId: authUser.id,
        recipientId: contactId
      });

      if (contactRequest.data) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            data: {
              sentContactRequest: contactRequest.toResponseData()
            }
          })
        };
      }

      await contactRequest.getPendingRequestIfExists({
        senderId: contactId,
        recipientId: authUser.id
      });

      if (contactRequest.data) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            data: {
              receivedContactRequest: contactRequest.toResponseData()
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
