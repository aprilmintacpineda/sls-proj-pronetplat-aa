const { query } = require('faunadb');
const User = require('dependencies/nodejs/models/User');
const {
  getAuthTokenFromHeaders,
  verifyHash,
  hasTimePassed
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ verificationCode }) {
  return validate(verificationCode, ['required', 'maxLength:20']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) return { statusCode: 403 };

    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));
    const user = new User();
    await user.getById(id);

    if (user.data.emailVerifiedAt)
      throw new Error('Email has already been verified');

    if (hasTimePassed(user.data.emailConfirmCodeExpiresAt))
      return { statusCode: 410 };

    if (
      !(await verifyHash(
        formBody.verificationCode,
        user.data.hashedEmailVerificationCode
      ))
    )
      throw new Error('Incorrect verification code');

    await user.update({
      emailVerifiedAt: query.Format('%t', query.Now()),
      emailConfirmCodeExpiresAt: null,
      emailCodeCanSendAt: null,
      hashedEmailVerificationCode: null
    });

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
