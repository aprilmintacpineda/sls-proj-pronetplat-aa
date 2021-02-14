const {
  checkRequiredHeaderValues
} = require('dependencies/nodejs/utils/helpers');
const { invokeEvent } = require('dependencies/nodejs/utils/lambda');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ email }) {
  return validate(email, ['required', 'email']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    checkRequiredHeaderValues(headers, false);

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

    await invokeEvent({
      functionName: process.env.fn_sendForgotPasswordCode,
      payload: formBody
    });
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 200 };
};
