const { query } = require('faunadb');

const validate = require('/opt/nodejs/utils/validate');
const { parseAuth, verifyHash, hasTimePassed } = require('/opt/nodejs/utils/helpers');
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

    if (hasTimePassed(user.data.emailConfirmCodeExpiresAt)) return { statusCode: 410 };

    if (
      !await verifyHash(
        formBody.verificationCode,
        user.data.hashedEmailVerificationCode
      )
    )
      throw new Error('Incorrect verification code');

    await user.update({ emailVerifiedAt: query.Now() });
    const authUser = user.toResponseData();
    const authToken = await jwt.sign(authUser);

    return {
      statusCode: 200,
      body: JSON.stringify({
        authUser,
        authToken
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
