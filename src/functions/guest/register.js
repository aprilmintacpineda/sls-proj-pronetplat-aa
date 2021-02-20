const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const { invokeEvent } = require('dependencies/utils/lambda');
const validate = require('dependencies/utils/validate');

function hasErrors ({ email, password }) {
  return (
    validate(email, ['required', 'email']) ||
    validate(password, ['required', 'password'])
  );
}

module.exports.handler = async ({ headers, body }) => {
  try {
    checkRequiredHeaderValues(headers, false);

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
