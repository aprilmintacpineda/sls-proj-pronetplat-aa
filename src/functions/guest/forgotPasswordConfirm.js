const { invokeEvent } = require('dependencies/nodejs/utils/lambda');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ confirmationCode, email, newPassword }) {
  return (
    validate(confirmationCode, ['required', 'maxLength:20']) ||
    validate(email, ['required', 'email']) ||
    validate(newPassword, ['required', 'password'])
  );
}

module.exports.handler = async ({ body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

    await invokeEvent({
      functionName: process.env.fn_confirmForgotPassword,
      payload: formBody
    });
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 200 };
};
