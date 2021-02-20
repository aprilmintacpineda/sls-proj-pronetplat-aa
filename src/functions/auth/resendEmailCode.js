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
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('invalid headers');
    return { statusCode: 400 };
  }

  let authUser;

  try {
    const token = await jwt.verify(headerValues.authToken);
    authUser = token.data;
  } catch (_1) {
    console.log('Invalid token');
    return { statusCode: 401 };
  }

  if (authUser.emailVerifiedAt) {
    console.log('Email not yet confirmed');
    return { statusCode: 403 };
  }

  if (!hasTimePassed(authUser.emailCodeCanSendAt)) {
    console.log('emailCodeCanSendAt has not yet passed');
    return { statusCode: 429 };
  }

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
};
