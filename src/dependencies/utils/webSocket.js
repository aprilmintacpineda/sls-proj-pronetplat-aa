const { invokeEvent } = require('./lambda');

module.exports.sendWebSocketEvent = payload => {
  return invokeEvent({
    functionName: process.env.fn_sendWebSocketEvent,
    payload
  });
};
