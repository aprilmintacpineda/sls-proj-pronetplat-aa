const Model = require('/opt/nodejs/classes/Model');
const HttpError = require('/opt/nodejs/classes/HttpError');

const { getTimeOffset } = require('/opt/nodejs/utils/faunadb');
const {
  randomCode,
  hash,
  verifyHash,
  hasTimePassed
} = require('/opt/nodejs/utils/helpers');
const {
  sendEmailVerificationCode,
  sendEmailResetPasswordCode,
  sendEmailResetPasswordSuccess
} = require('/opt/nodejs/utils/sendEmail');

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
    if (!hasTimePassed(this.data.passwordCodeCanResendAt))
      return new HttpError({ statusCode: 429 });

    const resetPasswordCode = randomCode();
    const hashedResetPasswordCode = await hash(resetPasswordCode);
    const offsetTime = getTimeOffset();

    await this.update({
      hashedResetPasswordCode,
      passwordCodeCanResendAt: offsetTime,
      passwordResetCodeExpiresAt: offsetTime
    });

    await sendEmailResetPasswordCode({
      recipient: this.data.email,
      resetPasswordCode,
      isResend
    });
  }

  async resetPassword ({ confirmationCode, newPassword }) {
    if (hasTimePassed(this.data.passwordResetCodeExpiresAt))
      return new HttpError({ statusCode: 410 });

    if (!await verifyHash(confirmationCode, this.data.hashedResetPasswordCode))
      return new HttpError({ statusCode: 403 });

    const hashedPassword = await hash(newPassword);

    await this.update({
      hashedPassword,
      hashedResetPasswordCode: null,
      passwordCodeCanResendAt: null,
      passwordResetCodeExpiresAt: null
    });

    await sendEmailResetPasswordSuccess(this.data.email);
  }
}

module.exports = new User();
