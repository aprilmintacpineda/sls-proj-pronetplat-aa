const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });

function invokeEvent ({ eventName, payload }) {
  return new Promise((resolve, reject) => {
    lambda.invoke(
      {
        FunctionName: process.env.fn_invokeApi,
        InvocationType: 'Event',
        Payload: JSON.stringify({
          eventName,
          payload
        })
      },
      error => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}

module.exports.invokeEvent = invokeEvent;

module.exports.sendWebSocketEvent = payload => {
  return invokeEvent({
    eventName: 'sendWebSocketEvent',
    payload
  });
};

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

module.exports.sendEmail = payload => {
  return invokeEvent({
    eventName: 'sendEmail',
    payload
  });
};
