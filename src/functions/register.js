const validate = require('/opt/nodejs/utils/validate');
const { randomCode, hash } = require('/opt/nodejs/utils/helpers');
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

  const emailVerificationCode = randomCode();

  const [hashedEmailVerificationCode, hashedPassword] = await Promise.all([
    hash(emailVerificationCode, 5),
    hash(password, 5)
  ]);

  await User.create({
    email,
    hashedEmailVerificationCode,
    hashedPassword
  });

  // send veritication code to email

  return { statusCode: 200 };
}

exports.handler = register;