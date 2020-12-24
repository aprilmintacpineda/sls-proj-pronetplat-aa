const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');

function hasErrors ({ email }) {
  return validate(email, ['required', 'email']);
}

async function handler ({ body }) {
  const formBody = JSON.parse(body);
  if (!hasErrors(formBody)) return { statusCode: 200 };

  try {
    const user = await User.fetchByEmail(body.email);
    if (!await user.forgotPassword()) return { statusCode: 429 };
  } catch (error) {
    console.log(error);
    if (error.type === 'httpError') return { statusCode: error.statusCode };
  }

  return { status: 200 };
}

module.exports = handler;
