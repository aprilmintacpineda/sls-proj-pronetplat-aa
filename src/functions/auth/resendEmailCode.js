const {
  getTimeOffset,
  initClient,
  updateById
} = require('dependencies/utils/faunadb');
const {
  hasTimePassed,
  randomCode,
  hash
} = require('dependencies/utils/helpers');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const jwt = require('dependencies/utils/jwt');
const {
  sendEmailVerificationCode
} = require('dependencies/utils/sendEmail');
const { getUserData } = require('dependencies/utils/users');

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
  const faunadb = initClient();

  const user = await faunadb.query(
    updateById('users', authUser.id, {
      hashedEmailVerificationCode,
      emailCodeCanSendAt: timeOffset,
      emailConfirmCodeExpiresAt: timeOffset
    })
  );

  const userData = getUserData(user);
  const [authToken] = await Promise.all([
    jwt.sign(userData),
    sendEmailVerificationCode({
      recipient: user.data.email,
      emailVerificationCode
    })
  ]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      authToken,
      userData
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.emailNotVerified]
});
