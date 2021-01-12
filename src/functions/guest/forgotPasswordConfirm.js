const User = require('/opt/nodejs/models/User');
const Clock = require('/opt/nodejs/classes/Clock');

const { getTimeOffset } = require('/opt/nodejs/utils/faunadb');
const { hash, verifyHash, hasTimePassed } = require('/opt/nodejs/utils/helpers');
const { sendEmailResetPasswordSuccess } = require('/opt/nodejs/utils/sendEmail');
const validate = require('/opt/nodejs/utils/validate');

const minTimeMs = 2300;

function hasErrors ({ confirmationCode, email, newPassword }) {
  return (
    validate(confirmationCode, ['required', 'maxLength:20']) ||
    validate(email, ['required', 'email']) ||
    validate(newPassword, ['required', 'password'])
  );
}

module.exports.handler = async ({ body }) => {
  const clock = new Clock(minTimeMs);

  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) return { statusCode: 200 };

    const { confirmationCode, email, newPassword } = formBody;
    const user = new User();
    await user.getByEmail(email);

    if (hasTimePassed(user.data.passwordResetCodeExpiresAt))
      throw new Error('password reset code expired');

    if (!await verifyHash(confirmationCode, user.data.hashedResetPasswordCode)) {
      const newData = {
        passwordResetCodeNumFailed: (user.data.passwordResetCodeNumFailed || 0) + 1
      };

      // limit retries to 3 and then force expire
      if (newData.passwordResetCodeNumFailed % 3 === 0) {
        newData.passwordResetCodeExpiresAt = getTimeOffset(true);
        newData.passwordResetCodeNumFailed = null;
      }

      await user.update(newData);
      throw new Error('incorrect code');
    }

    const hashedPassword = await hash(newPassword);

    await user.update({
      hashedPassword,
      hashedResetPasswordCode: null,
      passwordCodeCanResendAt: null,
      passwordResetCodeExpiresAt: null
    });

    await sendEmailResetPasswordSuccess(user.data.email);

    await clock.waitTillEnd();
    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  await clock.waitTillEnd();
  return { statusCode: 403 };
};
