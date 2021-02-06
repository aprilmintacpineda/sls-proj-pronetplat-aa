const User = require('dependencies/nodejs/models/User');
const {
  getTimeOffset
} = require('dependencies/nodejs/utils/faunadb');
const {
  randomCode,
  hash,
  hasTimePassed
} = require('dependencies/nodejs/utils/helpers');
const {
  sendEmailResetPasswordCode
} = require('dependencies/nodejs/utils/sendEmail');

module.exports.handler = async ({ email, isResend = false }) => {
  try {
    const user = new User();
    await user.getByEmail(email);

    if (!hasTimePassed(user.data.passwordCodeCanResendAt))
      throw new Error('passwordCodeCanResendAt has not passed yet.');

    const resetPasswordCode = randomCode();
    const offsetTime = getTimeOffset();
    const hashedResetPasswordCode = await hash(resetPasswordCode);

    await Promise.all([
      user.update({
        hashedResetPasswordCode,
        passwordCodeCanResendAt: offsetTime,
        passwordResetCodeExpiresAt: offsetTime
      }),
      sendEmailResetPasswordCode({
        recipient: user.data.email,
        resetPasswordCode,
        isResend
      })
    ]);
  } catch (error) {
    console.log('error', error);
  }
};
