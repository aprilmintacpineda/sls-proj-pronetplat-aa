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
          Thank you for using <i>Quaint; a professional networking platform for professionals,
          business persons, and entrepreneurs to grow.</i> Your email confirmation code is below.
          You will be asked for this verification code on your next login. You only have to enter it
          once.
        </p>
        <div style="position: relative;background-color: #d0d5d1;border-radius: 4px;padding: 10px;margin-top: 50px;margin-bottom: 50px;">
          <p style="color: gray;font-size: 10px;margin: 0; padding: 0;margin-bottom: 10px;">Your confirmation code</p>
          <h2 style="margin: 0; padding: 0;letter-spacing: 5px;">${emailVerificationCode}</h2>
        </div>
        <p>For your safety, this code will expire in 5 minutes. You can always resend a new confirmation code after it has expired.</p>
        <p>We sincerely hope to help you in your journey to your professional growth.</p>
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
          We are sending you this email because you submitted a forgot password request.
        </p>
        <div style="position: relative;background-color: #d0d5d1;border-radius: 4px;padding: 10px;margin-top: 50px;margin-bottom: 50px;">
          <p style="color: gray;font-size: 10px;margin: 0; padding: 0;margin-bottom: 10px;">Your confirmation code</p>
          <h2 style="margin: 0; padding: 0;letter-spacing: 5px;">${resetPasswordCode}</h2>
        </div>
        <p>For your safety, this code will expire in 5 minutes. You can always resend a new confirmation code after it has expired.</p>
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
