const { query } = require('faunadb');
const {
  getTimeOffset,
  initClient,
  getByIndex,
  selectRef,
  update
} = require('dependencies/utils/faunadb');
const { randomCode, hash } = require('dependencies/utils/helpers');
const {
  sendEmailResetPasswordCode
} = require('dependencies/utils/sendEmail');

module.exports.handler = async ({ email, isResend = false }) => {
  const faunadb = initClient();
  const resetPasswordCode = randomCode();

  try {
    const offsetTime = getTimeOffset();
    const hashedResetPasswordCode = await hash(resetPasswordCode);

    await faunadb.query(
      query.Let(
        {
          user: getByIndex('userByEmail', email)
        },
        query.If(
          query.And(
            query.ContainsPath(
              ['data', 'passwordCodeCanResendAt'],
              query.Var('user')
            ),
            query.LT(
              query.Now(),
              query.Time(
                query.Select(
                  ['data', 'passwordCodeCanResendAt'],
                  query.Var('user')
                )
              )
            )
          ),
          query.Abort('passwordCodeCanResendAtNotPastYet'),
          update(selectRef(query.Var('user')), {
            hashedResetPasswordCode,
            passwordCodeCanResendAt: offsetTime,
            passwordResetCodeExpiresAt: offsetTime
          })
        )
      )
    );
  } catch (error) {
    console.log('error', error);
    return;
  }

  await sendEmailResetPasswordCode({
    recipient: email,
    resetPasswordCode,
    isResend
  });
};
