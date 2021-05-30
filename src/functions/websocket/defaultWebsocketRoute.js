async function handler (webSocketEvent) {
  console.log(webSocketEvent);
  return { statusCode: 200 };
}

module.exports.handler = handler;
