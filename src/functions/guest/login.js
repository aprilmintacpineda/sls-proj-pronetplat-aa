const { query } = require('faunadb');
const RegisteredDevice = require('dependencies/models/RegisteredDevice');
const User = require('dependencies/models/User');
const {
  isValidDeviceToken
} = require('dependencies/utils/firebase');
const {
  verifyHash,
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const validate = require('dependencies/utils/validate');

function hasErrors ({ email, password }) {
  return (
    validate(email, ['required', 'email']) ||
    validate(password, ['required', 'maxLength:30'])
  );
}

module.exports.handler = async ({ headers, body }) => {
  const headerValues = checkRequiredHeaderValues(headers, false);

  if (!headerValues) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) {
    console.log('Invalid form body');
    return { statusCode: 400 };
  }

  const user = new User();
  await user.getByEmail(formBody.email);

  if (
    !(await verifyHash(
      formBody.password,
      user.data.hashedPassword
    )) ||
    !(await isValidDeviceToken(headerValues.deviceToken))
  )
    return { statusCode: 403 };

  const registeredDevice = new RegisteredDevice();

  await Promise.all([
    user.update({ lastLoginAt: query.Format('%t', query.Now()) }),
    registeredDevice.createOrUpdate({
      index: 'registeredDeviceByUserIdDeviceToken',
      args: [user.data.id, headerValues.deviceToken],
      data: {
        userId: user.data.id,
        deviceToken: headerValues.deviceToken,
        expiresAt: query.Format(
          '%t',
          query.TimeAdd(query.Now(), 7, 'days')
        )
      }
    })
  ]);

  const userData = user.toResponseData();
  const authToken = await jwt.sign(userData);

  return {
    statusCode: 200,
    body: JSON.stringify({
      authToken,
      userData
    })
  };
};
