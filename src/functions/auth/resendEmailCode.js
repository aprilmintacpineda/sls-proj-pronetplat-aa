const {
  parseAuth,
  hasTimePassed,
  randomCode,
  hash
} = require('/opt/nodejs/utils/helpers');
const jwt = require('/opt/nodejs/utils/jwt');
const { getTimeOffset } = require('/opt/nodejs/utils/faunadb');
const { sendEmailVerificationCode } = require('/opt/nodejs/utils/sendEmail');

const User = require('/opt/nodejs/models/User');

module.exports.handler = async ({ headers }) => {
  try {
    const auth = await jwt.verify(parseAuth(headers));
    const user = new User();
    await user.getById(auth.data.id);

    if (!hasTimePassed(user.data.emailCodeCanSendAt)) return { statusCode: 429 };

    const emailVerificationCode = randomCode();
    const hashedEmailVerificationCode = await hash(emailVerificationCode);
    const timeOffset = getTimeOffset();

    await user.update({
      hashedEmailVerificationCode,
      emailCodeCanSendAt: timeOffset,
      emailConfirmCodeExpiresAt: timeOffset
    });

    await sendEmailVerificationCode({
      recipient: user.data.email,
      emailVerificationCode,
      isResend: true
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
