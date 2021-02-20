const { query } = require('faunadb');
const RegisteredDevice = require('dependencies/models/RegisteredDevice');
const User = require('dependencies/models/User');
const {
  isValidDeviceToken
} = require('dependencies/utils/firebase');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { verifyHash } = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const validate = require('dependencies/utils/validate');

async function handler ({ formBody, deviceToken }) {
  const user = new User();
  await user.getByEmail(formBody.email);

  if (
    !(await verifyHash(
      formBody.password,
      user.data.hashedPassword
    )) ||
    !(await isValidDeviceToken(deviceToken))
  )
    return { statusCode: 403 };

  const registeredDevice = new RegisteredDevice();

  await Promise.all([
    user.update({ lastLoginAt: query.Format('%t', query.Now()) }),
    registeredDevice.createOrUpdate({
      index: 'registeredDeviceByUserIdDeviceToken',
      args: [user.data.id, deviceToken],
      data: {
        userId: user.data.id,
        deviceToken: deviceToken,
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
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.deviceToken],
  formValidator: ({ email, password }) => {
    return (
      validate(email, ['required', 'email']) ||
      validate(password, ['required', 'maxLength:30'])
    );
  }
});
