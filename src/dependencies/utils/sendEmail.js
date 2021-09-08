const { sendEmail } = require('./invokeLambda');

module.exports.sendEmailVerificationCode = ({
  recipient,
  emailVerificationCode
}) => {
  return sendEmail({
    recipient,
    from: 'email-verification@entrepic.com',
    content: `
      <div style="width: 500px; text-align: center;margin: 0 auto;">
        <h1 style="margin-bottom: 50px;">Verify your email</h1>
        <p>
          We sent you this email because you requested for a new email
          verification code.
        </p>
        <div
          style="
            position: relative;
            background-color: #d0d5d1;
            border-radius: 4px;
            padding: 10px;
            margin-top: 50px;
            margin-bottom: 50px;
          "
        >
          <p
            style="
              color: gray;
              font-size: 10px;
              margin: 0;
              padding: 0;
              margin-bottom: 10px;
            "
          >
            Your confirmation code
          </p>
          <h2
            style="
              margin: 0;
              padding: 0;
              letter-spacing: 5px;
            "
          >
            ${emailVerificationCode}
          </h2>
        </div>
        <p>
          For your safety, this code will expire in 5 minutes. You can only request
          a new code every 5 minutes.
        </p>
      </div>
    `,
    subject: 'Verify your email',
    emailType: 'resend-email-verification'
  });
};

module.exports.sendEmailWelcomeMessage = ({
  recipient,
  emailVerificationCode
}) => {
  return sendEmail({
    recipient,
    from: 'email-verification@entrepic.com',
    content: `
      <div style="width: 500px; text-align: center;margin: 0 auto;">
        <h1 style="margin-bottom: 50px;">Welcome to Entrepic!</h1>
        <p>
          Thank you for using
          <i>Entrepic; a networking platform for professionals,
          business people, and entrepreneurs to grow.</i>
        </p>
        <p>
          You may now login with your account. You will be asked for your
          email verification code, please enter the code below.
        </p>
        <div
          style="
            position: relative;
            background-color: #d0d5d1;
            border-radius: 4px;
            padding: 10px;
            margin-top: 50px;
            margin-bottom: 50px;
          "
        >
          <p
            style="
              color: gray;
              font-size: 10px;
              margin: 0;
              padding: 0;
              margin-bottom: 10px;
            "
          >
            Your confirmation code
          </p>
          <h2 style="margin: 0; padding: 0;letter-spacing: 5px;">
            ${emailVerificationCode}
          </h2>
        </div>
        <p>
          For your safety, this code will expire in 5 minutes. You can only request a new code every 5 minutes.
        </p>
        <p>
          We sincerely hope to help you in your journey to your
          professional growth.
        </p>
      </div>
    `,
    subject: 'Welcome to Entrepic',
    emailType: 'welcome'
  });
};

module.exports.sendEmailResetPasswordCode = ({
  recipient,
  resetPasswordCode,
  isResend
}) => {
  return sendEmail({
    recipient,
    from: 'forgot-password@entrepic.com',
    content: `
      <div style="width: 500px; text-align: center;margin: 0 auto;">
        <h1 style="margin-bottom: 50px;">
          Did you forgot your password?
        </h1>
        <p>
          We are sending you this email because you submitted a
          forgot password request.
        </p>
        <div
          style="
            position: relative;
            background-color: #d0d5d1;
            border-radius: 4px;
            padding: 10px;
            margin-top: 50px;
            margin-bottom: 50px;
          "
        >
          <p
            style="
              color: gray;
              font-size: 10px;
              margin: 0;
              padding: 0;
              margin-bottom: 10px;
            "
          >
            Your confirmation code
          </p>
          <h2
            style="
              margin: 0;
              padding: 0;
              letter-spacing: 5px;
            "
          >
            ${resetPasswordCode}
          </h2>
        </div>
        <p>
          For your safety, this code will expire in 5 minutes. You can only request a new code
          every 5 minutes.
        </p>
        <p>
          If you did not make this request, you can safely ignore
          this email.
        </p>
      </div>
    `,
    subject: 'Forgot password',
    emailType: isResend
      ? 'resend-forgot-password-request'
      : 'forgot-password-request'
  });
};

module.exports.sendEmailResetPasswordSuccess = recipient => {
  return sendEmail({
    recipient,
    from: 'forgot-password@entrepic.com',
    content: `
      <div
        style="
          width: 500px;
          text-align: center;
          margin: 0 auto;
        "
      >
        <h1 style="margin-bottom: 50px;">
          You have successfully reset your password.
        </h1>
        <p>
          We are sending you this email to inform you that
          you have reset your password using the forgot password form.
        </p>
        <p>
          If you did not make this password reset and you suspect
          that your account may have been compromised,
          please can contact support to ask for assistance.
        </p>
      </div>
    `,
    subject: 'Password reset successful',
    emailType: 'forgot-password-success'
  });
};

module.exports.sendEmailResetPasswordFailed = recipient => {
  return sendEmail({
    recipient,
    from: 'forgot-password@entrepic.com',
    content: `
      <div
        style="
          width: 500px;
          text-align: center;
          margin: 0 auto;
        "
      >
        <h1 style="margin-bottom: 50px;">
          Reset password failed.
        </h1>
        <p>
          We are sending you this email to inform you that your
          recent attempt to reset your password failed. This is either because
          your confirmation code has expired or you entered an incorrect
          code.
        </p>
        <p>
          If you did not make this password reset and you suspect
          that your account may have been compromised,
          please can contact support to ask for assistance.
        </p>
      </div>
    `,
    subject: 'Password reset failed.',
    emailType: 'forgot-password-success'
  });
};

module.exports.sendEmailChangePassword = recipient => {
  return sendEmail({
    recipient,
    from: 'change-password@entrepic.com',
    content: `
      <div
        style="
          width: 500px;
          text-align: center;
          margin: 0 auto;
        "
      >
        <h1 style="margin-bottom: 50px;">
          You have successfully changed your password.
        </h1>
        <p>
          We are sending you this email to inform you that
          you have changed your password using the change password form.
        </p>
        <p>
          If you did not make this change and you suspect
          that your account may have been compromised,
          please can contact support to ask for assistance.
        </p>
      </div>
    `,
    subject: 'Password change successful',
    emailType: 'change-password-success'
  });
};
