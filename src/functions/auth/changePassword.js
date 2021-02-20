const User = require('dependencies/models/User');
const {
  checkRequiredHeaderValues,
  hash,
  verifyHash
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const {
  changedPasswordEmail
} = require('dependencies/utils/sendEmail');
const {
  throwIfNotCompletedSetup
} = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

function hasErrors ({ currentPassword, newPassword }) {
  return (
    validate(currentPassword, ['required', 'password']) ||
    validate(newPassword, ['required', 'password'])
  );
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid form');

    const { data } = await jwt.verify(authToken);

    throwIfNotCompletedSetup(data);

    const authUser = new User();
    await authUser.getById(data.id);

    if (
      !(await verifyHash(
        formBody.currentPassword,
        authUser.data.hashedPassword
      ))
    )
      throw new Error('Invalid password');

    const passwordHash = await hash(formBody.newPassword);

    await Promise.all([
      authUser.update({
        hashedPassword: passwordHash
      }),
      changedPasswordEmail(authUser.data.email)
    ]);

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
