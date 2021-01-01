const NetworkRequest = require('/opt/nodejs/models/NetworkRequest');
const jwt = require('/opt/nodejs/utils/jwt');
const { parseAuth } = require('/opt/nodejs/utils/helpers');

module.exports.handler = async ({ headers }) => {
  let count = 0;

  try {
    const auth = await jwt.verify(parseAuth(headers));
    const networkRequest = new NetworkRequest();
    count = await networkRequest.countReceivedRequests(auth.data.id);
  } catch (error) {
    console.log(error);
  }

  return {
    statusCode: 200,
    body: count
  };
};
