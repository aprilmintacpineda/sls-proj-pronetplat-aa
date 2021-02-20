const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const { invokeEvent } = require('dependencies/utils/lambda');
const validate = require('dependencies/utils/validate');

function hasErrors ({ email }) {
  return validate(email, ['required', 'email']);
}

module.exports.handler = async ({ headers, body }) => {
  if (!checkRequiredHeaderValues(headers, false)) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) {
    console.log('Invalid form body');
    return { statusCode: 400 };
  }

  await invokeEvent({
    functionName: process.env.fn_sendForgotPasswordCode,
    payload: formBody
  });

  return { statusCode: 202 };
};
