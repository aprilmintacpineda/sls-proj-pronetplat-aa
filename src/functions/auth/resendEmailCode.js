const User = require('dependencies/nodejs/models/User');
const {
  getTimeOffset
} = require('dependencies/nodejs/utils/faunadb');
const {
  getAuthTokenFromHeaders,
  hasTimePassed,
  randomCode,
  hash
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  sendEmailVerificationCode
} = require('dependencies/nodejs/utils/sendEmail');

module.exports.handler = async ({ headers }) => {
  try {
    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));
    const user = new User();
    await user.getById(id);

    if (user.data.emailVerifiedAt)
      throw new Error('Email already verified');

    if (!hasTimePassed(user.data.emailCodeCanSendAt))
      return { statusCode: 429 };

    const emailVerificationCode = randomCode();

    const hashedEmailVerificationCode = await hash(
      emailVerificationCode
    );

    const timeOffset = getTimeOffset();

    await user.update({
      hashedEmailVerificationCode,
      emailCodeCanSendAt: timeOffset,
      emailConfirmCodeExpiresAt: timeOffset
    });

    await sendEmailVerificationCode({
      recipient: user.data.email,
      emailVerificationCode
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        emailCodeCanSendAt: user.data.emailCodeCanSendAt
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
