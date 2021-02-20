const User = require('dependencies/models/User');
const { getTimeOffset } = require('dependencies/utils/faunadb');
const {
  randomCode,
  hash,
  hasTimePassed
} = require('dependencies/utils/helpers');
const {
  sendEmailResetPasswordCode
} = require('dependencies/utils/sendEmail');

module.exports.handler = async ({ email, isResend = false }) => {
  const user = new User();
  await user.getByEmail(email);

  if (!hasTimePassed(user.data.passwordCodeCanResendAt)) {
    console.log('passwordCodeCanResendAt has not passed yet.');
    return;
  }

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
};
