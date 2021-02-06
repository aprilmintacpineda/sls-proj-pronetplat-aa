const { invokeEvent } = require('./lambda');

module.exports.createNotification = payload => {
  return invokeEvent({
    functionName: process.env.fn_createNotification,
    payload
  });
};
