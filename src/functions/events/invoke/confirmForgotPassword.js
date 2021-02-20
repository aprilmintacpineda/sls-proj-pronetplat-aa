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
  try {
    const user = new User();
    await user.getByEmail(email);

    if (hasTimePassed(user.data.passwordResetCodeExpiresAt))
      throw new Error('password reset code expired');

    if (
      !(await verifyHash(
        confirmationCode,
        user.data.hashedResetPasswordCode
      ))
    )
      throw new Error('incorrect code');

    const hashedPassword = await hash(newPassword);

    await Promise.all([
      user.update({
        hashedPassword,
        hashedResetPasswordCode: null,
        passwordCodeCanResendAt: null,
        passwordResetCodeExpiresAt: null
      }),
      sendEmailResetPasswordSuccess({
        recipient: user.data.email
      })
    ]);
  } catch (error) {
    console.log('error', error);
  }
};
