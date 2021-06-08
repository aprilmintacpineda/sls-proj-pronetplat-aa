const connect = require('./connect');
const disconnect = require('./disconnect');
const ping = require('./ping');

const eventHandlers = {
  ping,
  $connect: connect,
  $disconnect: disconnect
};

async function handler (webSocketEvent) {
  console.log(JSON.stringify(webSocketEvent));

  const { action, data } = JSON.parse(webSocketEvent.body);

  const handler = eventHandlers[action];
  if (!handler) {
    console.log('handler for action', action, 'not found');
    return { statusCode: 404 };
  }

  return handler(webSocketEvent, data);
}

module.exports.handler = handler;
