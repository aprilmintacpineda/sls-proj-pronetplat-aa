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
      await contactRequest.getPendingRequestIfExists({
        senderId: id,
        recipientId: contactId
      });

      if (contactRequest.data) {
        return {
          statusCode: 200,
          body: JSON.stringify(contactRequest.toResponseData())
        };
      }

      await contactRequest.getPendingRequestIfExists({
        senderId: contactId,
        recipientId: id
      });

      if (contactRequest.data) {
        return {
          statusCode: 200,
          body: JSON.stringify(contactRequest.toResponseData())
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
