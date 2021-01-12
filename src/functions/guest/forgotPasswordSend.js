const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');
const Clock = require('/opt/nodejs/classes/Clock');

/**
 * to prevent this endpoint from being used to enumerate
 * the emails of registered users, we need to ensure that
 * it the time it takes is always above a minimum value
 * derived from the average time it takes to process a
 * legitimate request.
 */
const minTimeMs = 2500;

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
    await user.resetPasswordRequest(isResend);
  } catch (error) {
    console.log('error', error);
  }

  await clock.waitTillEnd();

  // to prevent enumeration attack
  // we alway return 200
  return { statusCode: 200 };
};
