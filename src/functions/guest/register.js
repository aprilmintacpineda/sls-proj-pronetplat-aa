const User = require('/opt/nodejs/models/User');
const validate = require('/opt/nodejs/utils/validate');
const Clock = require('/opt/nodejs/utils/Clock');

/**
 * to prevent this endpoint from being used to enumerate
 * the emails of registered users, we need to ensure that
 * it the time it takes is always above a minimum value
 * derived from the average time it takes to process a
 * legitimate request.
 */
const minTimeSecs = 2.5;

function hasErrors ({ email, password }) {
  return (
    validate(email, ['required', 'email']) || validate(password, ['required', 'password'])
  );
}

module.exports.handler = async ({ body }) => {
  const clock = new Clock(minTimeSecs);

  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    const { email, password } = formBody;
    const user = new User();

    await user.createIfNotExists({
      index: 'userByEmail',
      args: [email],
      data: { email, password }
    });
  } catch (error) {
    console.log('error', error);
  }

  // to prevent enumeration attack
  // we alway return 200
  await clock.waitTillEnd();
  return { statusCode: 403 };
};
