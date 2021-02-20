const User = require('dependencies/models/User');
const { getTimeOffset } = require('dependencies/utils/faunadb');
const {
  hasTimePassed,
  randomCode,
  hash,
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const {
  sendEmailVerificationCode
} = require('dependencies/utils/sendEmail');

module.exports.handler = async ({ headers }) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);
    const { data: authUser } = await jwt.verify(authToken);

    if (authUser.emailVerifiedAt)
      throw new Error('Email already verified');

    if (!hasTimePassed(authUser.emailCodeCanSendAt))
      return { statusCode: 429 };

    const emailVerificationCode = randomCode();

    const hashedEmailVerificationCode = await hash(
      emailVerificationCode
    );

    const timeOffset = getTimeOffset();

    const user = new User();

    await Promise.all([
      user.updateById(authUser.id, {
        hashedEmailVerificationCode,
        emailCodeCanSendAt: timeOffset,
        emailConfirmCodeExpiresAt: timeOffset
      }),
      sendEmailVerificationCode({
        recipient: user.data.email,
        emailVerificationCode
      })
    ]);

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
