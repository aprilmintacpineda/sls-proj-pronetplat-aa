const { httpGuard } = require('dependencies/utils/httpGuard');
const { invokeEvent } = require('dependencies/utils/invokeLambda');
const validate = require('dependencies/utils/validate');

async function handler ({ formBody }) {
  await invokeEvent({
    eventName: 'confirmForgotPassword',
    payload: formBody
  });

  return { statusCode: 202 };
}

module.exports = httpGuard({
  handler,
  formValidator: ({ confirmationCode, email, newPassword }) => {
    return (
      validate(confirmationCode, ['required', 'maxLength:20']) ||
      validate(email, ['required', 'email']) ||
      validate(newPassword, ['required', 'password'])
    );
  }
});
