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
  sendEmailResetPasswordSuccess
} = require('dependencies/utils/sendEmail');

module.exports.handler = async ({
  confirmationCode,
  email,
  newPassword
}) => {
  const faunadb = initClient();

  const user = await faunadb.query(getByIndex('userByEmail', email));

  if (hasTimePassed(user.data.passwordResetCodeExpiresAt)) {
    console.log('password reset code expired');
    return;
  }

  if (
    !(await verifyHash(
      confirmationCode,
      user.data.hashedResetPasswordCode
    ))
  ) {
    console.log('incorrect code');
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
