const validate = require('/opt/nodejs/utils/validate');
const { invokeEvent } = require('/opt/nodejs/utils/lambda');

function hasErrors ({ email }) {
  return validate(email, ['required', 'email']);
}

module.exports.handler = async ({ body }) => {
  try {
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
