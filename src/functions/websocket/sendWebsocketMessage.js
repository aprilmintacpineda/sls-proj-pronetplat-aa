const AWS = require('aws-sdk');
const { query } = require('faunadb');
const {
  initClient,
  create,
  getById,
  getByIndex
} = require('dependencies/utils/faunadb');

async function handler (webSocketEvent) {
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

  let chatMessage;

  try {
    chatMessage = await faunadb.query(
      query.Let(
        {
          senderId: query.Select(
            ['ref', 'id'],
            getById(
              'users',
              query.Select(
                ['data', 'userId'],
                getByIndex(
                  'userWebSocketConnectionByConnectionId',
                  connectionId
                )
              )
            )
          )
        },
        query.If(
          // @todo should not be able to send message if not in contact
          query.Equals(query.Var('senderId'), recipientId),
          query.Abort('cannotSendToSelf'),
          create('chatMessages', {
            senderId: query.Var('senderId'),
            recipientId,
            messageBody
          })
        )
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'cannotSendToSelf')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  // @TODO send push notification to user if no active sockets

  const apiGateway = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${domainName}/${stage}`
  });

  const body = JSON.stringify({
    payload: {
      id: chatMessage.ref.id,
      ...chatMessage.data
    },
    messageId
  });

  await apiGateway
    .postToConnection({
      ConnectionId: connectionId,
      Data: body
    })
    .promise();

  return { statusCode: 200, body };
}

module.exports.handler = handler;
