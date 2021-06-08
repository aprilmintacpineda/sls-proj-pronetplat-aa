const routeKeyHandlers = {
  $default: require('./default'),
  $connect: require('./connect'),
  $disconnect: require('./disconnect')
};

async function handler (webSocketEvent) {
  const routeKey = webSocketEvent.requestContext.routeKey;
  const routeKeyHandler = routeKeyHandlers[routeKey];
  return routeKeyHandler(webSocketEvent);
}

module.exports.handler = handler;
