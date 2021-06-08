const { httpGuard } = require('dependencies/utils/httpGuard');
const { invokeEvent } = require('dependencies/utils/lambda');
const validate = require('dependencies/utils/validate');

async function handler ({ formBody }) {
  await invokeEvent({
    functionName: process.env.fn_sendForgotPasswordCode,
    payload: formBody
  });

  return { statusCode: 202 };
}

module.exports.handler = httpGuard({
  handler,
  formValidator: ({ email }) => {
    return validate(email, ['required', 'email']);
  }
});