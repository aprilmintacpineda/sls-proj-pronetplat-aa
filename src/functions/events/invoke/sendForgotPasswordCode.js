const User = require('/opt/nodejs/models/User');
const { getTimeOffset } = require('/opt/nodejs/utils/faunadb');
const {
  randomCode,
  hash,
  hasTimePassed
} = require('/opt/nodejs/utils/helpers');
const {
  sendEmailResetPasswordCode
} = require('/opt/nodejs/utils/sendEmail');

module.exports.handler = async ({ email, isResend = false }) => {
  try {
    const user = new User();
    await user.getByEmail(email);

    if (!hasTimePassed(user.data.passwordCodeCanResendAt))
      throw new Error('passwordCodeCanResendAt has not passed yet.');

    const resetPasswordCode = randomCode();
    const offsetTime = getTimeOffset();
    const hashedResetPasswordCode = await hash(resetPasswordCode);

    await user.update({
      hashedResetPasswordCode,
      passwordCodeCanResendAt: offsetTime,
      passwordResetCodeExpiresAt: offsetTime
    });

    await sendEmailResetPasswordCode({
      recipient: user.data.email,
      resetPasswordCode,
      isResend
    });
  } catch (error) {
    console.log('error', error);
  }
};
