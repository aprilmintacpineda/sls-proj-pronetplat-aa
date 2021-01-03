const ContactRequest = require('/opt/nodejs/models/ContactRequest');
const jwt = require('/opt/nodejs/utils/jwt');
const { getAuthTokenFromHeaders } = require('/opt/nodejs/utils/helpers');

module.exports.handler = async ({ headers }) => {
  let count = 0;

  try {
    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));
    const contactRequest = new ContactRequest();
    count = await contactRequest.countReceivedRequests(id);
  } catch (error) {
    console.log(error);
  }

  return {
    statusCode: 200,
    body: count
  };
};
