const AWS = require('aws-sdk');
const { initClient, create } = require('dependencies/utils/faunadb');

async function handler (webSocketEvent) {
  const { action, data } = JSON.parse(webSocketEvent.body);

  if (action !== 'sendmessage' && data.action !== 'sendChatMessage')
    return { statusCode: 403 };

  const { recipientId, messageBody, messageId } = data;

  const faunadb = initClient();
  const socket = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint:
      webSocketEvent.requestContext.domainName +
      '/' +
      webSocketEvent.requestContext.stage
  });

  const payload = await faunadb.query(
    create('chatMessages', {
      recipientId,
      messageBody
    })
  );

  await socket.postToConnection({
    ConectionId: webSocketEvent.requestContext.connectionId,
    data: {
      payload,
      messageId
    }
  });

  return { statusCode: 200 };
}

module.exports.handler = handler;
