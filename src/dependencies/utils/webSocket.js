const { invokeEvent } = require('./lambda');

module.exports.sendWebSocketEvent = payload => {
  return invokeEvent({
    event: 'sendWebSocketEvent',
    payload
  });
};
