const User = require('/opt/nodejs/models/User');
const Clock = require('/opt/nodejs/classes/Clock');

const { getTimeOffset } = require('/opt/nodejs/utils/faunadb');
const validate = require('/opt/nodejs/utils/validate');
const { randomCode, hash } = require('/opt/nodejs/utils/helpers');
const { sendEmailWelcomeMessage } = require('/opt/nodejs/utils/sendEmail');

const minTimeMs = 2300;

function hasErrors ({ email, password }) {
  return (
    validate(email, ['required', 'email']) || validate(password, ['required', 'password'])
  );
}

module.exports.handler = async ({ body }) => {
  const clock = new Clock(minTimeMs);

  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    const { email, password } = formBody;
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

  // to prevent enumeration attack
  // we alway return 200
  await clock.waitTillEnd();
  return { statusCode: 200 };
};
