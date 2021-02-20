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
  } catch (_1) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) {
    console.log('Invalid form body');
    return { statusCode: 400 };
  }

  await invokeEvent({
    functionName: process.env.fn_createAccount,
    payload: formBody
  });

  return { statusCode: 202 };
};
