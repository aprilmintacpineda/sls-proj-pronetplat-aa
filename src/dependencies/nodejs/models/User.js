const { query } = require('faunadb');
const Model = require('/opt/nodejs/classes/Model');
// const sendEmail = require('/opt/nodejs/utils/sendEmail');
const { initClient } = require('/opt/nodejs/utils/faunadb');

class User extends Model {
  constructor (instance) {
    super(instance);
    this.data.id = this.instance.ref.id;
  }

  // async sendVerificationCodeEmail (verificationCode) {
  //   await sendEmail({
  //     recipient,
  //     content,
  //     subject,
  //     emailType
  //   });
  // }

  static async fetchByEmail (email) {
    const client = initClient();

    const instance = await client.query(
      query.Get(
        query.Match(
          query.Index('userByEmail'),
          email
        )
      )
    );

    if (!instance) throw new Error('User not found');

    return new User(instance);
  }

  static async create ({ email, hashedPassword, hashedEmailVerificationCode }) {
    const client = initClient();

    const instance = await client.query(
      query.Create(
        query.Collection('users'),
        {
          data: {
            email,
            hashedPassword,
            hashedEmailVerificationCode,
            createdAt: query.Now(),
            updatedAt: query.Now()
          }
        }
      )
    );

    return new User(instance);
  }
}

module.exports = User;