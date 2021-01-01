const NetworkRequest = require('/opt/nodejs/models/NetworkRequest');

module.exports.handler = async () => {
  let count = 0;

  try {
    const networkRequest = new NetworkRequest();
    count = await networkRequest.countReceivedRequests();
  } catch (error) {
    console.log(error);
  }

  return {
    statusCode: 200,
    body: count
  };
};
