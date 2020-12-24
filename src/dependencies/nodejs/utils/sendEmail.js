const aws = require('aws-sdk');
const sesv2 = new aws.SESV2({
  apiVersion: '2019-09-27'
});

function sendEmailVerificationCode ({ recipient, emailVerificationCode, isResend }) {
  return sendEmail({
    recipient,
    content: `
      <div style="width: 500px; text-align: center;">
        <h1 style="margin-bottom: 50px;">Welcome to Quaint!</h1>
        <p>
          Thank you for using <strong>Quaint; a professional networking platform for professionals,
          business persons, and entrepreneurs to grow.</strong> Your email confirmation code is below.
          You will be asked for this verification code on your next login. You only have to enter it
          once.
        </p>
        <div style="position: relative; height: 150px;">
          <div style="position: absolute;background-color: #d0d5d1;border-radius: 4px;padding: 10px;top: 50%;left: 50%;transform: translate(-50%, -50%);">
            <p style="color: gray;font-size: 10px;margin: 0; padding: 0;margin-bottom: 10px;">Your confirmation code</p>
            <h2 style="margin: 0; padding: 0;letter-spacing: 5px;">${emailVerificationCode}</h2>
          </div>
        </div>
        <p>We hope that you find the platform useful on your journey to professional growth.</p>
      </div>
    `,
    subject: 'Email Verification: Welcome to Quaint',
    emailType: isResend ? 'resend-email-verification' : 'email-verification'
  });
}

function sendResetPasswordCode ({ recipient, resetPasswordCode, isResend }) {
  return sendEmail({
    recipient,
    content: `
      <div style="width: 500px; text-align: center;">
        <h1 style="margin-bottom: 50px;">Did you forgot your password?</h1>
        <p>
          We are sending you this email because you submitted a forgot password request. This code will expire in 5 minutes.
        </p>
        <div style="position: relative; height: 150px;">
          <div style="position: absolute;background-color: #d0d5d1;border-radius: 4px;padding: 10px;top: 50%;left: 50%;transform: translate(-50%, -50%);">
            <p style="color: gray;font-size: 10px;margin: 0; padding: 0;margin-bottom: 10px;">Your confirmation code</p>
            <h2 style="margin: 0; padding: 0;letter-spacing: 5px;">${resetPasswordCode}</h2>
          </div>
        </div>
        <p>If you did not make this request, you can safely ignore this email.</p>
      </div>
    `,
    subject: 'Forgot password: Quaint',
    emailType: isResend ? 'resend-forgot-password-request' : 'forgot-password-request'
  });
}

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

module.exports.sendEmailVerificationCode = sendEmailVerificationCode;
module.exports.sendResetPasswordCode = sendResetPasswordCode;
