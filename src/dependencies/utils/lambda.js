const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });

module.exports.invokeEvent = ({ event, payload }) => {
  return new Promise((resolve, reject) => {
    lambda.invoke(
      {
        FunctionName: process.env.fn_invokeApi,
        InvocationType: 'Event',
        Payload: JSON.stringify({
          event,
          payload
        })
      },
      error => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
};
