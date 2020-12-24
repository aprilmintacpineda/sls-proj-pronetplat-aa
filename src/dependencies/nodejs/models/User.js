const { query } = require('faunadb');
const Model = require('/opt/nodejs/classes/Model');
const HttpError = require('/opt/nodejs/classes/HttpError');
const { randomCode, hash, hasTimePassed } = require('/opt/nodejs/utils/helpers');
const {
  sendEmailVerificationCode,
  sendResetPasswordCode
} = require('/opt/nodejs/utils/sendEmail');

function getOffsetTime () {
  return query.TimeAdd(query.Now(), 5, 'minutes');
}

class User extends Model {
  constructor () {
    super('users');
  }

  async fetchByEmail (email) {
    await this.getByIndex('userByEmail', email);
  }

  async create ({ password, ...data }) {
    const emailVerificationCode = randomCode();

    const [hashedEmailVerificationCode, hashedPassword] = await Promise.all([
      hash(emailVerificationCode),
      hash(password)
    ]);

    await super.create({
      ...data,
      hashedEmailVerificationCode,
      hashedPassword,
      emailCodeCanSendAt: getOffsetTime()
    });

    await sendEmailVerificationCode({
      recipient: data.email,
      emailVerificationCode
    });
  }

  async resetPasswordRequest () {
    if (!hasTimePassed(this.data.passwordCodeCanResendAt)) throw new HttpError(429);

    const resetPasswordCode = randomCode();
    const hashedResetPasswordCode = await hash(resetPasswordCode);

    await this.update({
      hashedResetPasswordCode,
      passwordCodeCanResendAt: getOffsetTime()
    });

    await sendResetPasswordCode({
      recipient: this.data.email,
      resetPasswordCode
    });

    return true;
  }
}

module.exports = User;
