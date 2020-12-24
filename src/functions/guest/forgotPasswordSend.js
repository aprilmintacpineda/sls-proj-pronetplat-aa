const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');

function hasErrors ({ email }) {
  return validate(email, ['required', 'email']);
}

module.exports.handler = async ({ body }) => {
  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) return { statusCode: 200 };

  try {
    const user = new User();
    await user.fetchByEmail(formBody.email);
    await user.sendPasswordResetCode();
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 200 };
};
