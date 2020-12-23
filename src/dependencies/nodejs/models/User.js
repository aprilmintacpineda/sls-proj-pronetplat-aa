const { query } = require('faunadb');
const Model = require('/opt/nodejs/classes/Model');
const sendEmail = require('/opt/nodejs/utils/sendEmail');
const { randomCode, hash } = require('/opt/nodejs/utils/helpers');
const { initClient } = require('/opt/nodejs/utils/faunadb');

class User extends Model {
  constructor (instance) {
    super(instance);
  }

  canSendEmailVerificationCode () {
    return new Date(this.data.emailCodeCanSendAt) < new Date();
  }

  async resendEmailVerificationCode () {
    const client = initClient();
    const emailVerificationCode = randomCode();
    const hashedEmailVerificationCode = await hash(emailVerificationCode, 5);
    await this.sendEmailVerificationCode(hashedEmailVerificationCode, true);

    this.instance = await client.query(
      query.Update(this.instance.ref, {
        data: {
          hashedEmailVerificationCode,
          emailCodeCanSendAt: query.TimeAdd(query.Now(), 5, 'minutes')
        }
      })
    );
  }

  async sendEmailVerificationCode (verificationCode, isResend = false) {
    await sendEmail({
      recipient: this.data.email,
      content: `
        <div style="width: 500px; text-align: center;">
          <h1 style="margin-bottom: 50px;">Welcome to Quaint!</h1>
          <p>
            Thank you for using <strong>Quaint; a professional networking platform for professionals,
            business persons, and entrepreneurs to grow.</strong> Your email confirmation code is below.
            You will be asked for this verification code on your next login. You only have to enter it
            once.
          </p>
          <div style="display: flex;justify-content: center;margin-top: 50px;margin-bottom: 50px;">
            <div style="background-color: #d0d5d1;border-radius: 4px;padding: 10px;">
              <p style="color: gray;font-size: 10px;margin: 0; padding: 0;margin-bottom: 10px;">Your confirmation code</p>
              <h2 style="margin: 0; padding: 0;letter-spacing: 5px;">${verificationCode}</h2>
            </div>
          </div>
          <p>
            We hope that you find the platform useful on your journey to professional growth. Your feedback
            is always welcome, send them to <a href="mailto:feedback@quaint-app.com">feedback@quaint-app.com</a>
          </p>
        </div>
      `,
      subject: 'Email Verification: Welcome to Quaint',
      emailType: isResend ? 'resend-email-verification' : 'email-verification'
    });
  }

  static async fetchByEmail (email) {
    const client = initClient();

    const instance = await client.query(
      query.Get(query.Match(query.Index('userByEmail'), email))
    );

    if (!instance) throw new Error('User not found');

    return new User(instance);
  }

  static async register ({ email, password }) {
    const client = initClient();

    const emailVerificationCode = randomCode();
    const [hashedEmailVerificationCode, hashedPassword] = await Promise.all([
      hash(emailVerificationCode, 5),
      hash(password, 5)
    ]);

    const instance = await client.query(
      query.Create(query.Collection('users'), {
        data: {
          email,
          hashedPassword,
          hashedEmailVerificationCode,
          emailCodeCanSendAt: query.TimeAdd(query.Now(), 5, 'minutes'),
          createdAt: query.Now(),
          updatedAt: query.Now()
        }
      })
    );

    const user = new User(instance);
    await user.sendEmailVerificationCode(emailVerificationCode);

    return user;
  }
}

module.exports = User;
