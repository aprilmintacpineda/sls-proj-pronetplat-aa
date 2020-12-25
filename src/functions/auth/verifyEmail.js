const validate = require('/opt/nodejs/utils/validate');
const { parseAuth } = require('/opt/nodejs/utils/helpers');
const jwt = require('/opt/nodejs/utils/jwt');
const User = require('/opt/nodejs/models/User');

function hasErrors ({ verificationCode }) {
  return validate(verificationCode, ['required', 'maxLength:11']);
}

module.exports.handler = async ({ headers, body }) => {
  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) return { statusCode: 403 };

  try {
    const auth = await jwt.verify(parseAuth(headers));
    const user = new User();
    await user.getById(auth.data.id);
    console.log(auth);
    console.log(user);
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
