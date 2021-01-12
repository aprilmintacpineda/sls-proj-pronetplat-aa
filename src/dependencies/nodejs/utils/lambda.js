const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });

module.exports.invokeEvent = ({ functionName, payload }) => {
  return new Promise((resolve, reject) => {
    lambda.invoke(
      {
        FunctionName: functionName,
        InvocationType: 'Event',
        Payload: JSON.stringify(payload)
      },
      error => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
};
