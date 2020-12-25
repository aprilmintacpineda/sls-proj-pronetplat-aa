const { addHours } = require('date-fns');
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

  hasReachedResetPasswordLimit () {
    // limit number of times users can send reset
    // password requests every 24 hours
    return (
      this.data.passwordResetRequestNum &&
      this.data.passwordResetRequestNum % 3 === 0 &&
      !hasTimePassed(addHours(new Date(this.data.passwordCodeCanResendAt), 24))
    );
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

  async resetPasswordRequest (isResend) {
    if (
      !hasTimePassed(this.data.passwordCodeCanResendAt) ||
      this.hasReachedResetPasswordLimit()
    ) {
      // to prevent enumeration attack,
      // always respond with 200
      throw new HttpError({ statusCode: 200 });
    }

    const resetPasswordCode = randomCode();
    const hashedResetPasswordCode = await hash(resetPasswordCode);
    const offsetTime = getTimeOffset();
    const passwordResetRequestNum = (this.data.passwordResetRequestNum || 0) + 1;

    await this.update({
      hashedResetPasswordCode,
      passwordCodeCanResendAt: offsetTime,
      passwordResetCodeExpiresAt: offsetTime,
      passwordResetRequestNum
    });

    await sendEmailResetPasswordCode({
      recipient: this.data.email,
      resetPasswordCode,
      isResend,
      passwordResetRequestNum
    });
  }

  async resetPassword ({ confirmationCode, newPassword }) {
    // to prevent enumeration attack
    // we will always respond with 403 on all
    // errors on this process

    if (hasTimePassed(this.data.passwordResetCodeExpiresAt))
      throw new HttpError({ statusCode: 403 });

    if (!await verifyHash(confirmationCode, this.data.hashedResetPasswordCode)) {
      const newData = {
        passwordResetCodeNumFailed: (this.data.passwordResetCodeNumFailed || 0) + 1
      };

      // limit retries to 3 and then force expire
      if (newData.passwordResetCodeNumFailed % 3 === 0)
        newData.passwordResetCodeExpiresAt = getTimeOffset(true);

      await this.update(newData);
      throw new HttpError({ statusCode: 403 });
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
}

module.exports = new User();
