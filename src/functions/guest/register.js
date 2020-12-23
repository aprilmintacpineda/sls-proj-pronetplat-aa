const User = require('/opt/nodejs/models/User');
const validate = require('/opt/nodejs/utils/validate');

function hasErrors ({ email, password }) {
  console.log(
    'hasErrors',
    validate(email, ['required', 'email']) || validate(password, ['required', 'password'])
  );

  return (
    validate(email, ['required', 'email']) || validate(password, ['required', 'password'])
  );
}

async function register ({ body }) {
  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) return { statusCode: 200 };

  const { email, password } = formBody;

  try {
    await User.fetchByEmail(email);

    console.log('User already exists.');

    // to prevent enumeration attack
    // we just say register success
    return { statusCode: 200 };
  } catch (error) {
    // can proceed to registration
  }

  await new User().create({ email, password });
  return { statusCode: 200 };
}

exports.handler = register;
