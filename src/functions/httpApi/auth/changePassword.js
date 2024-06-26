const {
  initClient,
  update,
  getById
} = require('dependencies/utils/faunadb');
const { hash, verifyHash } = require('dependencies/utils/helpers');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  sendEmailChangePassword
} = require('dependencies/utils/sendEmail');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const faunadb = initClient();

  const user = await faunadb.query(getById('users', authUser.id));

  if (
    !(await verifyHash(
      formBody.currentPassword,
      user.data.hashedPassword
    ))
  ) {
    console.log('Incorrect password');
    return { statusCode: 403 };
  }

  await faunadb.query(
    update(user.ref, {
      hashedPassword: await hash(formBody.newPassword)
    })
  );

  await sendEmailChangePassword(user.data.email);

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  formValidator: ({ currentPassword, newPassword }) => {
    return (
      validate(currentPassword, ['required']) ||
      validate(newPassword, ['required', 'password'])
    );
  }
});
