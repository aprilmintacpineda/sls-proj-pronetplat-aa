const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');

function hasErrors ({ email }) {
  return validate(email, ['required', 'email']);
}

module.exports.handler = async ({ body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) return { statusCode: 200 };

    const { email, isResend = false } = formBody;
    const user = new User();
    await user.getByEmail(email);
    await user.resetPasswordRequest(isResend);
  } catch (error) {
    console.log('error', error);
  }

  // to prevent enumeration attack
  // we alway return 200
  return { statusCode: 200 };
};
