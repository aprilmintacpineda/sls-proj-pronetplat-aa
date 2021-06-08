const { invokeEvent } = require('./lambda');

module.exports.createNotification = payload => {
  return invokeEvent({
    eventName: 'createNotification',
    payload
  });
};

module.exports.sendPushNotification = payload => {
  return invokeEvent({
    eventName: 'sendPushNotification',
    payload
  });
};
