const { invokeEvent } = require('./lambda');

module.exports.createNotification = payload => {
  return invokeEvent({
    event: 'createNotification',
    payload
  });
};

module.exports.sendPushNotification = payload => {
  return invokeEvent({
    event: 'sendPushNotification',
    payload
  });
};
