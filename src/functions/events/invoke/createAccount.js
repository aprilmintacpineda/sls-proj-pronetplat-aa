const {
  getTimeOffset,
  initClient,
  createIfNotExists
} = require('dependencies/utils/faunadb');
const { randomCode, hash } = require('dependencies/utils/helpers');
const {
  sendEmailWelcomeMessage
} = require('dependencies/utils/sendEmail');

module.exports.handler = async ({ email, password }) => {
  const emailVerificationCode = randomCode();

  const [
    hashedEmailVerificationCode,
    hashedPassword
  ] = await Promise.all([
    hash(emailVerificationCode),
    hash(password)
  ]);

  const offsetTime = getTimeOffset();
  const faunadb = initClient();

  const user = await faunadb.query(
    createIfNotExists({
      collection: 'users',
      index: 'userByEmail',
      args: [email],
      data: {
        email,
        hashedEmailVerificationCode,
        hashedPassword,
        emailCodeCanSendAt: offsetTime,
        emailConfirmCodeExpiresAt: offsetTime,
        isTestAccount: false
      }
    })
  );

  if (user) {
    await sendEmailWelcomeMessage({
      recipient: user.data.email,
      emailVerificationCode
    });
  }
};
