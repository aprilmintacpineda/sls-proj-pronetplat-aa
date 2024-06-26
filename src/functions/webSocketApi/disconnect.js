const {
  initClient,
  hardDeleteIfExists
} = require('dependencies/utils/faunadb');

async function handler (webSocketEvent) {
  const faunadb = initClient();

  await faunadb.query(
    hardDeleteIfExists(
      'userWebSocketConnectionByConnectionId',
      webSocketEvent.requestContext.connectionId
    )
  );

  return { statusCode: 200 };
}

module.exports = handler;
