const { invokeEvent } = require('./lambda');

module.exports.createNotification = payload => {
  return invokeEvent({
    functionName: process.env.fn_createNotification,
    payload
  });
};

module.exports.sendPushNotification = payload => {
  return invokeEvent({
    functionName: process.env.fn_sendPushNotification,
    payload
  });
};
