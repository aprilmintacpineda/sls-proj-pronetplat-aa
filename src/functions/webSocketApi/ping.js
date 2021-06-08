const AWS = require('aws-sdk');

const apiGateway = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: 'ag8f8kbtz8.execute-api.ap-southeast-1.amazonaws.com/dev'
});

module.exports = async webSocketEvent => {
  await apiGateway
    .postToConnection({
      ConnectionId: webSocketEvent.requestContext.connectionId,
      Data: 'pong'
    })
    .promise();

  return { statusCode: 200 };
};
