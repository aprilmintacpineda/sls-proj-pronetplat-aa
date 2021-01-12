const User = require('/opt/nodejs/models/User');
const Clock = require('/opt/nodejs/classes/Clock');

const validate = require('/opt/nodejs/utils/validate');
const { getTimeOffset } = require('/opt/nodejs/utils/faunadb');
const { randomCode, hash, hasTimePassed } = require('/opt/nodejs/utils/helpers');
const { sendEmailResetPasswordCode } = require('/opt/nodejs/utils/sendEmail');

const minTimeMs = 2400;

function hasErrors ({ email }) {
  return validate(email, ['required', 'email']);
}

module.exports.handler = async ({ body }) => {
  const clock = new Clock(minTimeMs);

  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) return { statusCode: 200 };

    const { email, isResend = false } = formBody;
    const user = new User();
    await user.getByEmail(email);

    if (!hasTimePassed(user.data.passwordCodeCanResendAt))
      throw new Error('passwordCodeCanResendAt has not passed yet.');

    const resetPasswordCode = randomCode();
    const hashedResetPasswordCode = await hash(resetPasswordCode);
    const offsetTime = getTimeOffset();

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

  await clock.waitTillEnd();
  return { statusCode: 200 };
};
