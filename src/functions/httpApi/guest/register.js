const { httpGuard } = require('dependencies/utils/httpGuard');
const { invokeEvent } = require('dependencies/utils/lambda');
const validate = require('dependencies/utils/validate');

async function handler ({ formBody }) {
  await invokeEvent({
    eventName: 'createAccount',
    payload: formBody
  });

  return { statusCode: 202 };
}

module.exports = httpGuard({
  handler,
  formValidator: ({ email, password }) => {
    return (
      validate(email, ['required', 'email']) ||
      validate(password, ['required', 'password'])
    );
  }
});
