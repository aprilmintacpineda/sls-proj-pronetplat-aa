const aws = require('aws-sdk');
const sesv2 = new aws.SESV2({
  apiVersion: '2019-09-27'
});

function sendEmail ({ recipient, content, subject, emailType }) {
  return new Promise(resolve => {
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
        if (error) console.log(error);
        resolve();
      }
    );
  });
}

module.exports = sendEmail;
