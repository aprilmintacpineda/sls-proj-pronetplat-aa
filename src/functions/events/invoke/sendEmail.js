const AWS = require('aws-sdk');

const sesv2 = new AWS.SESV2({
  apiVersion: '2019-09-27'
});

module.exports.handler = async ({ recipient, content, subject, emailType }) => {
  await new Promise((resolve, reject) => {
    sesv2.sendEmail(
      {
        Content: {
          Simple: {
            Body: {
              Html: {
                Data: content
              }
            },
            Subject: {
              Data: subject
            }
          }
        },
        Destination: {
          ToAddresses: [recipient]
        },
        EmailTags: [
          {
            Name: 'Email-Type',
            Value: emailType
          }
        ],
        FromEmailAddress: 'aprilmintacpineda@gmail.com'
      },
      error => {
        if (error) reject(reject);
        else resolve();
      }
    );
  });
};