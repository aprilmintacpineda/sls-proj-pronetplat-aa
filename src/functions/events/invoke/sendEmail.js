const AWS = require('aws-sdk');

const sesv2 = new AWS.SESV2({
  apiVersion: '2019-09-27'
});

module.exports.handler = async ({
  recipient,
  content,
  subject,
  emailType,
  from
}) => {
  await new Promise((resolve, reject) => {
    sesv2.sendEmail(
      {
        Content: {
          Simple: {
            Body: {
              Html: {
                Data:
                  content +
                  `
                    <br>
                    <p>
                      <small>
                        This is a system generated email. Do not reply to this email.
                      </small>
                    </p>
                    <p>
                      <small>
                        If you need additional assistance, please send us an email to <a href="mailto:hello@entrepic.com">hello@entrepic.com</a>
                      </small>
                    </p>
                `
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
        FromEmailAddress: from,
        ReplyToAddresses: ['hello@entrepic.com']
      },
      error => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
};
