const { query } = require('faunadb');
const RegisteredDevice = require('dependencies/models/RegisteredDevice');
const User = require('dependencies/models/User');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const jwt = require('dependencies/utils/jwt');

async function handler ({ authUser, deviceToken }) {
  const user = new User();
  const registeredDevice = new RegisteredDevice();

  await Promise.all([
    registeredDevice.createOrUpdate({
      index: 'registeredDeviceByUserIdDeviceToken',
      args: [authUser.id, deviceToken],
      data: {
        userId: authUser.id,
        deviceToken,
        expiresAt: query.Format(
          '%t',
          query.TimeAdd(query.Now(), 7, 'days')
        )
      }
    }),
    user.updateById(authUser.id, {
      lastLoginAt: query.Format(
        '%t',
        query.TimeAdd(query.Now(), 7, 'days')
      )
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
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ]
});
