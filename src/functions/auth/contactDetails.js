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
    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));

    const contact = new Contact();
    const contactRequest = new ContactRequest();

    if (!(await contact.isInContact(id, contactId))) {
      await contactRequest.getPendingRequestIfExists({
        senderId: id,
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
        recipientId: id
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

    // get contact details
    // send back
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
