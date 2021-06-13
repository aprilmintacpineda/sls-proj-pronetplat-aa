const {
  initClient,
  getByIndex,
  update
} = require('dependencies/utils/faunadb');
const {
  hash,
  verifyHash,
  hasTimePassed
} = require('dependencies/utils/helpers');
const {
  sendEmailResetPasswordSuccess,
  sendEmailResetPasswordFailed
} = require('dependencies/utils/sendEmail');

module.exports = async ({
  confirmationCode,
  email,
  newPassword
}) => {
  const faunadb = initClient();

  const user = await faunadb.query(getByIndex('userByEmail', email));

  if (
    hasTimePassed(user.data.passwordResetCodeExpiresAt) ||
    !(await verifyHash(
      confirmationCode,
      user.data.hashedResetPasswordCode
    ))
  ) {
    console.log('Reset password failed.');
    await sendEmailResetPasswordFailed(user.data.email);
    return;
  }

  const hashedPassword = await hash(newPassword);

  await faunadb.query(
    update(user.ref, {
      hashedPassword,
      hashedResetPasswordCode: null,
      passwordCodeCanResendAt: null,
      passwordResetCodeExpiresAt: null
    })
  );

  await sendEmailResetPasswordSuccess(user.data.email);
};
