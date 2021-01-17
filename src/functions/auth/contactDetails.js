const jwt = require('/opt/nodejs/utils/jwt');
const {
  getAuthTokenFromHeaders
} = require('/opt/nodejs/utils/helpers');
const Contact = require('/opt/nodejs/models/Contact');
const ContactRequest = require('/opt/nodejs/models/ContactRequest');

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
      const sentContactRequest = await contactRequest.getPendingRequestIfExists(
        {
          senderId: id,
          recipientId: contactId
        }
      );

      console.log('sentContactRequest', sentContactRequest);

      if (sentContactRequest) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            sentContactRequestId: sentContactRequest.data.id
          })
        };
      }

      const receivedContactRequest = await contactRequest.getPendingRequestIfExists(
        {
          senderId: contactId,
          recipientId: id
        }
      );

      console.log('receivedContactRequest', receivedContactRequest);

      if (receivedContactRequest) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            receivedContactRequestId: receivedContactRequest.data.id
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
