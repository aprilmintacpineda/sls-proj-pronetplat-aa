const { query } = require('faunadb');
const RegisteredDevice = require('dependencies/nodejs/models/RegisteredDevice');
const User = require('dependencies/nodejs/models/User');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const { invokeEvent } = require('dependencies/nodejs/utils/lambda');
const {
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');
const validate = require('dependencies/nodejs/utils/validate');

function hasError ({ deviceToken }) {
  return validate(deviceToken, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  let authToken = null;
  let deviceToken = null;

  try {
    const formBody = JSON.parse(body);
    if (hasError(formBody)) throw new Error('invalid form body');

    authToken = getAuthTokenFromHeaders(headers);
    deviceToken = formBody.deviceToken;

    const { data: authUser } = await jwt.verify(authToken);
    throwIfNotCompletedSetup(authUser);

    const user = new User();
    const registeredDevice = new RegisteredDevice();

    await Promise.all([
      registeredDevice.updateByIndex({
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

    if (error.constructor === jwt.TokenExpiredError) {
      await invokeEvent({
        functionName: process.env.fn_forceExpireDeviceToken,
        payload: {
          deviceToken,
          authToken
        }
      });
    }
  }

  return { statusCode: 403 };
};
