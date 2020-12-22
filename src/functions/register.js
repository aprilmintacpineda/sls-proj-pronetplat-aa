const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');

function didPassFieldValidation ({ email, password }) {
  return (
    validate(email, ['required', 'email']) &&
    validate(password, ['required', 'password'])
  );
}

async function register ({ body }) {
  const formBody = JSON.parse(body);

  if (!didPassFieldValidation(formBody)) return { status: 400 };

  const { email } = formBody;
  const user = new User({ email });
  await user.fetchByEmail();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Ah, shit.'
    })
  };
}

exports.handler = register;