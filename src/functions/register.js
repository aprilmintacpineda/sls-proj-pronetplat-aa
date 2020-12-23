const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');

function didPassFieldValidation ({ email, password }) {
  console.log(
    validate(email, ['required', 'email']),
    validate(password, ['required', 'password'])
  );

  return (
    !validate(email, ['required', 'email']) &&
    !validate(password, ['required', 'password'])
  );
}

async function register ({ body }) {
  const formBody = JSON.parse(body);
  if (!didPassFieldValidation(formBody)) return { statusCode: 400 };

  try {
    await User.fetchByEmail(formBody.email);

    console.log('User already exists.');

    // to prevent enumeration attack
    // we just say register success
    return { statusCode: 200 };
  } catch (error) {
    // can proceed to registration
  }

  await User.register(formBody);
  return { statusCode: 200 };
}

exports.handler = register;
