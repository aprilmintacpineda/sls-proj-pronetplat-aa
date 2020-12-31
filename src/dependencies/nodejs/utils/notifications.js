const AWS = require('aws-sdk');

const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });

module.exports.sendPushNotification = payload => {
  lambda.invoke({
    FunctionName: process.env.PUSH_NOTIF_FN,
    InvocationType: 'Event',
    Payload: JSON.stringify(payload)
  });
};
