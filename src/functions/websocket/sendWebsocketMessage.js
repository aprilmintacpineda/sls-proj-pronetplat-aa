const AWS = require('aws-sdk');
const { query } = require('faunadb');
const {
  initClient,
  create,
  getById,
  getByIndex
} = require('dependencies/utils/faunadb');

async function handler (webSocketEvent) {
  console.log(webSocketEvent);

  const { action, data } = JSON.parse(webSocketEvent.body);

  if (action !== 'sendmessage' && data.action !== 'sendChatMessage')
    return { statusCode: 403 };

  const { recipientId, messageBody, messageId } = data;
  const {
    connectionId,
    domainName,
    stage
  } = webSocketEvent.requestContext;
  const faunadb = initClient();

  const chatMessage = await faunadb.query(
    query.Let(
      {
        sender: getById(
          'users',
          query.Select(
            ['data', 'userId'],
            getByIndex(
              'userWebSocketConnectionByConnectionId',
              connectionId
            )
          )
        )
      },
      create('chatMessages', {
        senderId: query.Select(['ref', 'id'], query.Var('sender')),
        recipientId,
        messageBody
      })
    )
  );

  // send push notification to user if needed

  const apiGateway = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${domainName}/${stage}`
  });

  await apiGateway
    .postToConnection({
      ConnectionId: connectionId,
      Data: {
        payload: {
          id: chatMessage.ref.id,
          ...chatMessage.data
        },
        messageId
      }
    })
    .promise();

  return { statusCode: 200 };
}

module.exports.handler = handler;
