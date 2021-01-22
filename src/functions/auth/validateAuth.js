const { query } = require('faunadb');
const RegisteredDevice = require('dependencies/nodejs/models/RegisteredDevice');
const User = require('dependencies/nodejs/models/User');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const { invokeEvent } = require('dependencies/nodejs/utils/lambda');
const validate = require('dependencies/nodejs/utils/validate');

function hasError ({ deviceToken }) {
  return validate(deviceToken, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  const formBody = JSON.parse(body);
  const authToken = getAuthTokenFromHeaders(headers);
  const { deviceToken } = formBody;

  try {
    if (hasError(formBody)) throw new Error('invalid form body');

    const {
      data: { id }
    } = await jwt.verify(authToken);

    const user = new User();
    const registeredDevice = new RegisteredDevice();

    await Promise.all([
      registeredDevice.getByIndex(
        'registeredDeviceByUserIdDeviceToken',
        id,
        deviceToken
      ),
      user.getById(id)
    ]);

    const authUser = user.toResponseData();
    const [newAuthToken] = await Promise.all([
      jwt.sign(authUser),
      registeredDevice.update({
        expiresAt: query.Format(
          '%t',
          query.TimeAdd(query.Now(), 7, 'days')
        )
      }),
      user.update({
        lastLoginAt: query.Format(
          '%t',
          query.TimeAdd(query.Now(), 7, 'days')
        )
      })
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        authToken: newAuthToken,
        authUser
      })
    };
  } catch (error) {
    console.log('error', error);

    if (error.constructor === jwt.TokenExpiredError) {
      invokeEvent({
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
