const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');

function hasErrors ({ email }) {
  return validate(email, ['required', 'email']);
}

module.exports.handler = async ({ body }) => {
  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) return { statusCode: 200 };

  try {
    const { email, isResend = false } = formBody;
    const user = new User();
    await user.fetchByEmail(email);
    await user.sendPasswordResetCode(isResend);
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 200 };
};
