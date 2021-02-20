const { query } = require('faunadb');
const RegisteredDevice = require('dependencies/models/RegisteredDevice');
const User = require('dependencies/models/User');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const { hasCompletedSetup } = require('dependencies/utils/users');

module.exports.handler = async ({ headers }) => {
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  let authUser;

  try {
    const token = await jwt.verify(headerValues.authToken);
    authUser = token.data;
  } catch (_1) {
    console.log('Invalid token');
    return { statusCode: 401 };
  }

  if (!hasCompletedSetup(authUser)) {
    console.log('Not yet setup');
    return { statusCode: 403 };
  }

  const user = new User();
  const registeredDevice = new RegisteredDevice();

  await Promise.all([
    registeredDevice.createOrUpdate({
      index: 'registeredDeviceByUserIdDeviceToken',
      args: [authUser.id, headerValues.deviceToken],
      data: {
        userId: authUser.id,
        deviceToken: headerValues.deviceToken,
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
};
