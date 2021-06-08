const eventHandlers = {
  ping: require('./ping')
};

module.exports = webSocketEvent => {
  const { action, data } = JSON.parse(webSocketEvent.body);
  const eventHandler = eventHandlers[action];

  if (!eventHandler) {
    console.log('handler for action', action, 'not found');
    return { statusCode: 404 };
  }

  return eventHandler(data, webSocketEvent);
};
