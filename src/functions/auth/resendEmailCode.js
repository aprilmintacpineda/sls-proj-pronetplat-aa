const User = require('dependencies/models/User');
const { getTimeOffset } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const {
  hasTimePassed,
  randomCode,
  hash
} = require('dependencies/utils/helpers');
const {
  sendEmailVerificationCode
} = require('dependencies/utils/sendEmail');

async function handler ({ authUser }) {
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
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.emailVerified
  ]
});
