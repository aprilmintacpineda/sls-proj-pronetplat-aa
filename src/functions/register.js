const bcrypt = require('bcrypt');

const validate = require('/opt/nodejs/utils/validate');
const { randomCode } = require('/opt/nodejs/utils/helpers');
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
    await User.fetchByEmail();
    return { statusCode: 409 };
  } catch (error) {
    // can proceed to registration
  }

  const emailVerificationCode = randomCode();
  const [hashedEmailVerificationCode, hashedPassword] = await Promise.all([
    bcrypt.hash(emailVerificationCode),
    bcrypt.hash(password)
  ]);

  const user = await User.create({
    email,
    hashedEmailVerificationCode,
    hashedPassword
  });

  console.log(JSON.stringify(user.instance, null, 2));

  // send veritication code to email

  return { statusCode: 200 };
}

exports.handler = register;