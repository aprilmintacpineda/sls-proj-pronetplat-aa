const validate = require('/opt/nodejs/utils/validate');

function hasErrors ({ verificationCode }) {
  return validate(verificationCode, ['required', 'maxLength:11']);
}

module.exports.handler = async event => {
  console.log(event);

  const formBody = JSON.parse(event.body);
  if (hasErrors(formBody)) return { statusCode: 403 };

  return { statusCode: 403 };
};
