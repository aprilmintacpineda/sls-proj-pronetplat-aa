const User = require('/opt/nodejs/models/User');
const {
  hash,
  verifyHash,
  hasTimePassed
} = require('/opt/nodejs/utils/helpers');
const {
  sendEmailResetPasswordSuccess
} = require('/opt/nodejs/utils/sendEmail');

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

    await user.update({
      hashedPassword,
      hashedResetPasswordCode: null,
      passwordCodeCanResendAt: null,
      passwordResetCodeExpiresAt: null
    });

    await sendEmailResetPasswordSuccess({
      recipient: user.data.email
    });
  } catch (error) {
    console.log('error', error);
  }
};
