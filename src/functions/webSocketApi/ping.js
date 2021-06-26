const { postToConnection } = require('dependencies/utils/webSocket');

module.exports = async webSocketEvent => {
  await postToConnection({
    ConnectionId: webSocketEvent.requestContext.connectionId,
    Data: 'pong'
  });

  return { statusCode: 200 };
};
