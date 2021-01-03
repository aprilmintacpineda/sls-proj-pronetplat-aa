const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');
const Clock = require('/opt/nodejs/classes/Clock');

const minTimeSecs = 2.4;

function hasErrors ({ confirmationCode, email, newPassword }) {
  return (
    validate(confirmationCode, ['required', 'maxLength:20']) ||
    validate(email, ['required', 'email']) ||
    validate(newPassword, ['required', 'password'])
  );
}

module.exports.handler = async ({ body }) => {
  const clock = new Clock(minTimeSecs);

  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) return { statusCode: 200 };

    const user = new User();
    await user.getByEmail(formBody.email);
    await user.resetPassword(formBody);
    await clock.waitTillEnd();
    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  await clock.waitTillEnd();

  return { statusCode: 403 };
};
