const validate = require('/opt/nodejs/utils/validate');
const { invokeEvent } = require('/opt/nodejs/utils/lambda');

function hasErrors ({ email, password }) {
  return (
    validate(email, ['required', 'email']) ||
    validate(password, ['required', 'password'])
  );
}

module.exports.handler = async ({ body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    await invokeEvent({
      functionName: process.env.fn_createAccount,
      payload: formBody
    });
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 200 };
};
