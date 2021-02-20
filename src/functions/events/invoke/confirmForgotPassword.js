const User = require('dependencies/models/User');
const {
  hash,
  verifyHash,
  hasTimePassed
} = require('dependencies/utils/helpers');
const {
  sendEmailResetPasswordSuccess
} = require('dependencies/utils/sendEmail');

module.exports.handler = async ({
  confirmationCode,
  email,
  newPassword
}) => {
  const user = new User();
  await user.getByEmail(email);

  if (hasTimePassed(user.data.passwordResetCodeExpiresAt)) {
    console.log('password reset code expired');
    return;
  }

  if (
    !(await verifyHash(
      confirmationCode,
      user.data.hashedResetPasswordCode
    ))
  ) {
    console.log('incorrect code');
    return;
  }

  const hashedPassword = await hash(newPassword);

  await Promise.all([
    user.update({
      hashedPassword,
      hashedResetPasswordCode: null,
      passwordCodeCanResendAt: null,
      passwordResetCodeExpiresAt: null
    }),
    sendEmailResetPasswordSuccess(user.data.email)
  ]);
};
