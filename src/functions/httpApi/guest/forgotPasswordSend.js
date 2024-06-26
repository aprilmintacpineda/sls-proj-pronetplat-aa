const { httpGuard } = require('dependencies/utils/httpGuard');
const { invokeEvent } = require('dependencies/utils/invokeLambda');
const validate = require('dependencies/utils/validate');

async function handler ({ formBody }) {
  await invokeEvent({
    eventName: 'sendForgotPasswordCode',
    payload: formBody
  });

  return { statusCode: 202 };
}

module.exports = httpGuard({
  handler,
  formValidator: ({ email }) => {
    return validate(email, ['required', 'email']);
  }
});
