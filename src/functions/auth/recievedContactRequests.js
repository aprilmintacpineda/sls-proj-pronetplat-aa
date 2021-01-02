const jwt = require('/opt/nodejs/utils/jwt');
const { parseAuth } = require('/opt/nodejs/utils/helpers');
const ContactRequest = require('/opt/nodejs/models/ContactRequest');

module.exports.handler = async ({ pathParameters: { after }, headers }) => {
  let data = [];
  let nextToken = null;

  try {
    const auth = await jwt.verify(parseAuth(headers));
    const result = await ContactRequest.listReceivedRequests(auth.data.id, after);

    data = result.data;
    nextToken = result.nextToken;
  } catch (error) {
    console.log('error', error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      data,
      nextToken
    })
  };
};
