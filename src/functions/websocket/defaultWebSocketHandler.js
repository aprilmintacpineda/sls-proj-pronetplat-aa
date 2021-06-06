const ping = require('dependencies/handlers/websocket/ping');

const eventHandlers = {
  ping
};

async function handler (webSocketEvent) {
  const { action, data } = JSON.parse(webSocketEvent.body);

  const handler = eventHandlers[action];
  if (!handler) {
    console.log('handler for action', action, 'not found');
    return { statusCode: 404 };
  }

  return handler(webSocketEvent, data);
}

module.exports.handler = handler;
