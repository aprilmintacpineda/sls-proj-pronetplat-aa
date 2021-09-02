const routeKeyHandlers = {
  $default: require('./default'),
  $connect: require('./connect'),
  $disconnect: require('./disconnect')
};

async function handler (webSocketEvent) {
  console.log(JSON.stringify(webSocketEvent, null, 2));

  const routeKey = webSocketEvent.requestContext.routeKey;
  const routeKeyHandler = routeKeyHandlers[routeKey];
  return routeKeyHandler(webSocketEvent);
}

module.exports.handler = handler;
