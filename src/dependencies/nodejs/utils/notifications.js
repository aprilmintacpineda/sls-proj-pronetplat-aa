const { invokeEvent } = require('./lambda');

module.exports.sendPushNotification = payload => {
  return invokeEvent({
    functionName: process.env.fn_sendPushNotifications,
    payload
  });
};
