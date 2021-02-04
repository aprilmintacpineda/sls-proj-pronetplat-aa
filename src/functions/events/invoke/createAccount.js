const User = require('dependencies/nodejs/models/User');
const {
  getTimeOffset
} = require('dependencies/nodejs/utils/faunadb');
const {
  randomCode,
  hash
} = require('dependencies/nodejs/utils/helpers');
const {
  sendEmailWelcomeMessage
} = require('dependencies/nodejs/utils/sendEmail');

module.exports.handler = async ({ email, password }) => {
  try {
    const emailVerificationCode = randomCode();

    const [
      hashedEmailVerificationCode,
      hashedPassword
    ] = await Promise.all([
      hash(emailVerificationCode),
      hash(password)
    ]);

    const offsetTime = getTimeOffset();

    const user = new User();
    const wasCreated = await user.createIfNotExists({
      index: 'userByEmail',
      args: [email],
      data: {
        email,
        hashedEmailVerificationCode,
        hashedPassword,
        emailCodeCanSendAt: offsetTime,
        emailConfirmCodeExpiresAt: offsetTime
      }
    });

    if (wasCreated) {
      await sendEmailWelcomeMessage({
        recipient: user.data.email,
        emailVerificationCode
      });
    }
  } catch (error) {
    console.log('error', error);
  }
};
