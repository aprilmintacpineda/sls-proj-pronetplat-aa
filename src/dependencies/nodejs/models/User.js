const Model = require('/opt/nodejs/classes/Model');
const HttpError = require('/opt/nodejs/classes/HttpError');
const { randomCode, hash, hasTimePassed } = require('/opt/nodejs/utils/helpers');
const {
  sendEmailVerificationCode,
  sendResetPasswordCode
} = require('/opt/nodejs/utils/sendEmail');

const { getTimeOffset } = require('/opt/nodejs/utils/faunadb');

class User extends Model {
  constructor () {
    super('users');
  }

  fetchByEmail (email) {
    return this.getByIndex('userByEmail', email);
  }

  async create ({ password, ...data }) {
    const emailVerificationCode = randomCode();

    const [hashedEmailVerificationCode, hashedPassword] = await Promise.all([
      hash(emailVerificationCode),
      hash(password)
    ]);

    const offsetTime = getTimeOffset();

    await super.create({
      ...data,
      hashedEmailVerificationCode,
      hashedPassword,
      emailCodeCanSendAt: offsetTime,
      emailConfirmCodeExpiresAt: offsetTime
    });

    await sendEmailVerificationCode({
      recipient: data.email,
      emailVerificationCode
    });
  }

  async sendPasswordResetCode (isResend) {
    if (!hasTimePassed(this.data.passwordCodeCanResendAt)) throw new HttpError(429);

    const resetPasswordCode = randomCode();
    const hashedResetPasswordCode = await hash(resetPasswordCode);
    const offsetTime = getTimeOffset();

    await this.update({
      hashedResetPasswordCode,
      passwordCodeCanResendAt: offsetTime,
      passwordResetCodeExpiresAt: offsetTime
    });

    await sendResetPasswordCode({
      recipient: this.data.email,
      resetPasswordCode,
      isResend
    });

    return true;
  }
}

module.exports = User;
