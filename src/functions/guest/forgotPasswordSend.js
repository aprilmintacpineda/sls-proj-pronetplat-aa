const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');

function hasErrors ({ email }) {
  return validate(email, ['required', 'email']);
}

module.exports.handler = async ({ body }) => {
  const formBody = JSON.parse(body);
  if (!hasErrors(formBody)) return { statusCode: 200 };

  try {
    const user = await User.fetchByEmail(body.email);
    await user.forgotPassword();
  } catch (error) {
    console.log(error);
    if (error.type === 'httpError') return { statusCode: error.statusCode };
  }

  return { status: 200 };
};
