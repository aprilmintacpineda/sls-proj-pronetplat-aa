const ping = require('dependencies/handlers/websocket/ping');

const eventHandlers = {
  ping
};

async function handler (webSocketEvent) {
  const { event, payload } = JSON.parse(webSocketEvent.body).data;

  const handler = eventHandlers[event];
  if (!handler) return { statusCode: 404 };

  return eventHandlers(payload);
}

module.exports.handler = handler;
