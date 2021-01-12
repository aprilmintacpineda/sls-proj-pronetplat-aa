const { invokeEvent } = require('./lambda');

module.exports.sendPushNotification = payload => {
  return invokeEvent({
    functionName: process.env.PUSH_NOTIF_FN,
    payload
  });
};
