const AWS = require('aws-sdk');
const { query } = require('faunadb');
const {
  initClient,
  create,
  getById,
  getByIndex
} = require('dependencies/utils/faunadb');

async function handler (webSocketEvent) {
  const body = JSON.parse(webSocketEvent.body);

  console.log(body);

  const { recipientId, messageBody, messageId } = body;
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

  chatMessage = JSON.stringify({
    payload: {
      id: chatMessage.ref.id,
      ...chatMessage.data
    },
    messageId
  });

  await apiGateway
    .postToConnection({
      ConnectionId: connectionId,
      Data: chatMessage
    })
    .promise();

  return { statusCode: 200, body: chatMessage };
}

module.exports.handler = handler;
