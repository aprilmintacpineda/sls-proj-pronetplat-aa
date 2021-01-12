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
  sendEmailWelcomeMessage,
  sendEmailResetPasswordCode,
  sendEmailResetPasswordSuccess
} = require('/opt/nodejs/utils/sendEmail');

module.exports = class User extends Model {
  collection = 'users';
  censoredData = ['hashedEmailVerificationCode', 'hashedPassword'];

  getByEmail (email) {
    return this.getByIndex('userByEmail', email);
  }

  async createIfNotExists ({ password, ...data }) {
    const emailVerificationCode = randomCode();

    const [hashedEmailVerificationCode, hashedPassword] = await Promise.all([
      hash(emailVerificationCode),
      hash(password)
    ]);

    const offsetTime = getTimeOffset();

    await super.createIfNotExists({
      ...data,
      hashedEmailVerificationCode,
      hashedPassword,
      emailCodeCanSendAt: offsetTime,
      emailConfirmCodeExpiresAt: offsetTime
    });

    await sendEmailWelcomeMessage({
      recipient: data.email,
      emailVerificationCode
    });
  }

  async resetPasswordRequest (isResend) {
    if (!hasTimePassed(this.data.passwordCodeCanResendAt)) {
      // to prevent enumeration attack,
      // always respond with 200
      throw new HttpError({ statusCode: 200 });
    }

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
    // to prevent enumeration attack
    // we will always respond with 403 on all
    // errors on this process

    if (hasTimePassed(this.data.passwordResetCodeExpiresAt))
      throw new Error('password reset code expired');

    if (!await verifyHash(confirmationCode, this.data.hashedResetPasswordCode)) {
      const newData = {
        passwordResetCodeNumFailed: (this.data.passwordResetCodeNumFailed || 0) + 1
      };

      // limit retries to 3 and then force expire
      if (newData.passwordResetCodeNumFailed % 3 === 0) {
        newData.passwordResetCodeExpiresAt = getTimeOffset(true);
        newData.passwordResetCodeNumFailed = null;
      }

      await this.update(newData);
      throw new Error('incorrecrt code');
    }

    const hashedPassword = await hash(newPassword);

    await this.update({
      hashedPassword,
      hashedResetPasswordCode: null,
      passwordCodeCanResendAt: null,
      passwordResetCodeExpiresAt: null
    });

    await sendEmailResetPasswordSuccess(this.data.email);
  }
};
