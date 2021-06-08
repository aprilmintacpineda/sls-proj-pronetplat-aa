const $connect = require('./connect');
const $disconnect = require('./disconnect');
const ping = require('./ping');

const eventHandlers = {
  ping
};

async function $default (webSocketEvent) {
  const { action, data } = JSON.parse(webSocketEvent.body);

  const eventHandler = eventHandlers[action];
  if (!eventHandler) {
    console.log('handler for action', action, 'not found');
    return { statusCode: 404 };
  }

  await eventHandler(data, webSocketEvent);
}

const routeKeyHandlers = {
  $default: $default,
  $connect: $connect,
  $disconnect: $disconnect
};

async function handler (webSocketEvent) {
  console.log(JSON.stringify(webSocketEvent));
  const routeKey = webSocketEvent.requestContext.routeKey;
  const routeKeyHandler = routeKeyHandlers[routeKey];
  await routeKeyHandler(webSocketEvent);
}

module.exports.handler = handler;
