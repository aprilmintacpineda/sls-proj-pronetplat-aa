const User = require('dependencies/models/User');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { hash, verifyHash } = require('dependencies/utils/helpers');
const {
  sendEmailChangePassword
} = require('dependencies/utils/sendEmail');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const user = new User();
  await user.getById(authUser.id);

  if (
    !(await verifyHash(
      formBody.currentPassword,
      user.data.hashedPassword
    ))
  ) {
    console.log('Invalid password');
    return { statusCode: 403 };
  }

  const passwordHash = await hash(formBody.newPassword);

  await Promise.all([
    user.update({
      hashedPassword: passwordHash
    }),
    sendEmailChangePassword(user.data.email)
  ]);

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ],
  formValidator: ({ currentPassword, newPassword }) => {
    return (
      validate(currentPassword, ['required', 'password']) ||
      validate(newPassword, ['required', 'password'])
    );
  }
});
