const User = require('/opt/nodejs/models/User');

const { getTimeOffset } = require('/opt/nodejs/utils/faunadb');
const { randomCode, hash } = require('/opt/nodejs/utils/helpers');
const { sendEmailWelcomeMessage } = require('/opt/nodejs/utils/sendEmail');

module.exports.handler = async ({ email, password }) => {
  try {
    const user = new User();
    const emailVerificationCode = randomCode();

    const [hashedEmailVerificationCode, hashedPassword] = await Promise.all([
      hash(emailVerificationCode),
      hash(password)
    ]);

    const offsetTime = getTimeOffset();

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
