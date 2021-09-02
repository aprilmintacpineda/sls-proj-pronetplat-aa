const {
  initClient,
  createOrUpdate
} = require('dependencies/utils/faunadb');
const jwt = require('dependencies/utils/jwt');

async function handler (webSocketEvent) {
  const authorization = (webSocketEvent.headers.Authorization || '')
    .replace(/Bearer /gim, '')
    .trim();

  if (!authorization) {
    console.log('Guard: auth failed');
    return { statusCode: 401 };
  }

  let authUser = await jwt.verify(authorization);
  authUser = authUser.data;

  const faunadb = initClient();

  await faunadb.query(
    createOrUpdate({
      index: 'userWebSocketConnectionsByUserIdConnectionId',
      args: [
        authUser.id,
        webSocketEvent.requestContext.connectionId
      ],
      collection: 'userWebSocketConnections',
      data: {
        userId: authUser.id,
        connectionId: webSocketEvent.requestContext.connectionId
      }
    })
  );

  return { statusCode: 200 };
}

module.exports = handler;
