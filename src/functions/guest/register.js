const user = require('/opt/nodejs/models/User');
const validate = require('/opt/nodejs/utils/validate');

function hasErrors ({ email, password }) {
  return (
    validate(email, ['required', 'email']) || validate(password, ['required', 'password'])
  );
}

module.exports.handler = async ({ body }) => {
  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) return { statusCode: 200 };

  const { email, password } = formBody;

  try {
    await user.fetchByEmail(email);

    console.log('User already exists.');

    // to prevent enumeration attack
    // we alway return 200
    return { statusCode: 200 };
  } catch (error) {
    // can proceed to registration
  }

  await user.create({ email, password });
  return { statusCode: 200 };
};
