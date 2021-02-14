const { query } = require('faunadb');
const RegisteredDevice = require('dependencies/nodejs/models/RegisteredDevice');
const User = require('dependencies/nodejs/models/User');
const {
  checkRequiredHeaderValues
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');

module.exports.handler = async ({ headers }) => {
  try {
    const { deviceToken, authToken } = checkRequiredHeaderValues(
      headers
    );

    const { data: authUser } = await jwt.verify(authToken);

    throwIfNotCompletedSetup(authUser);

    const user = new User();
    const registeredDevice = new RegisteredDevice();

    await Promise.all([
      registeredDevice.createOrUpdate({
        index: 'registeredDeviceByUserIdDeviceToken',
        args: [authUser.id, deviceToken],
        data: {
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
    const newAuthToken = await jwt.sign(userData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        authToken: newAuthToken,
        userData
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
