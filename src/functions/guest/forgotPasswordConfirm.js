const validate = require('/opt/nodejs/utils/validate');
const HttpError = require('/opt/nodejs/classes/HttpError');
const User = require('/opt/nodejs/models/User');

function hasErrors ({ confirmationCode, email, newPassword }) {
  return (
    validate(confirmationCode, ['required']) ||
    validate(email, ['required', 'email']) ||
    validate(newPassword, ['required', 'password'])
  );
}

module.exports.handler = async ({ body }) => {
  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) return { statusCode: 200 };

  try {
    const user = new User();
    await user.fetchByEmail(formBody.email);
    await user.resetPassword(formBody);
  } catch (error) {
    console.log('error', error);
    if (error.constructor === HttpError) return error.toResponse();
  }

  // to prevent enumeration attack
  // we alway return 200
  return { statusCode: 200 };
};
