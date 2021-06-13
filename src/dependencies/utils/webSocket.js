const { invokeEvent } = require('./lambda');

module.exports.sendWebSocketEvent = payload => {
  return invokeEvent({
    eventName: 'sendWebSocketEvent',
    payload
  });
};
