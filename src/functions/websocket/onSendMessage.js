async function handler (websocketEvent) {
  console.log(websocketEvent);

  return {
    statusCode: 200,
    body: 'pong'
  };
}

module.exports.handler = handler;
