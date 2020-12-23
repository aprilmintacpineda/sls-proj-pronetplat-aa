const { query } = require('faunadb');
const Model = require('/opt/nodejs/classes/Model');
const { randomCode, hash } = require('/opt/nodejs/utils/helpers');
const { sendEmailVerificationCode } = require('/opt/nodejs/utils/sendEmail');

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
      hash(emailVerificationCode, 5),
      hash(password, 5)
    ]);

    await super.create({
      ...data,
      hashedEmailVerificationCode,
      hashedPassword,
      emailCodeCanSendAt: query.TimeAdd(query.Now(), 5, 'minutes')
    });

    await sendEmailVerificationCode(emailVerificationCode);
  }
}

module.exports = User;
