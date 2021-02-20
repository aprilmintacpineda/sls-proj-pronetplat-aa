const User = require('dependencies/models/User');
const {
  checkRequiredHeaderValues,
  hash,
  verifyHash
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const {
  sendEmailChangePassword
} = require('dependencies/utils/sendEmail');
const { hasCompletedSetup } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

function hasErrors ({ currentPassword, newPassword }) {
  return (
    validate(currentPassword, ['required', 'password']) ||
    validate(newPassword, ['required', 'password'])
  );
}

module.exports.handler = async ({ headers, body }) => {
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) {
    console.log('invalid form body');
    return { statusCode: 400 };
  }

  let authUser;

  try {
    const token = await jwt.verify(headerValues.authToken);
    authUser = token.data;
  } catch (error) {
    console.log('invalid token');
    return { statusCode: 401 };
  }

  if (!hasCompletedSetup(authUser)) {
    console.log('Not completed setup yet');
    return { statusCode: 403 };
  }

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
};
