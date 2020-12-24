const validate = require('/opt/nodejs/utils/validate');
const user = require('/opt/nodejs/models/User');

function hasErrors ({ email }) {
  return validate(email, ['required', 'email']);
}

module.exports.handler = async ({ body }) => {
  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) return { statusCode: 200 };

  try {
    const { email, isResend = false } = formBody;
    await user.fetchByEmail(email);
    await user.sendPasswordResetCode(isResend);
  } catch (error) {
    console.log('error', error);
  }

  // to prevent enumeration attack
  // we alway return 200
  return { statusCode: 200 };
};
