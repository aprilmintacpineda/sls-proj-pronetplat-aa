const ping = require('dependencies/handlers/websocket/ping');

const eventHandlers = {
  ping
};

async function handler (webSocketEvent) {
  const { action, data } = JSON.parse(webSocketEvent.body);

  const handler = eventHandlers[action];
  if (!handler) return { statusCode: 404 };

  return handler(data);
}

module.exports.handler = handler;
