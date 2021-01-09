const jwt = require('/opt/nodejs/utils/jwt');
const { getAuthTokenFromHeaders } = require('/opt/nodejs/utils/helpers');
const Contact = require('/opt/nodejs/models/Contact');

module.exports.handler = async ({ pathParameters: { contactId }, headers }) => {
  try {
    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));
    const contact = new Contact();

    console.log(await contact.isInContact(id, contactId));
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
