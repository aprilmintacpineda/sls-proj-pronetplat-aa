const { query } = require('faunadb');
const validate = require('/opt/nodejs/utils/validate');
const jwt = require('/opt/nodejs/utils/jwt');
const { invokeEvent } = require('/opt/nodejs/utils/lambda');
const {
  getAuthTokenFromHeaders
} = require('/opt/nodejs/utils/helpers');
const User = require('/opt/nodejs/models/User');
const RegisteredDevice = require('/opt/nodejs/models/RegisteredDevice');

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

    await registeredDevice.getByIndex(
      'registeredDeviceByUserIdDeviceToken',
      id,
      deviceToken
    );

    const authUser = user.toResponseData();
    const [newAuthToken] = await Promise.all([
      jwt.sign(authUser),
      user.getById(id),
      registeredDevice.update({
        expiresAt: query.Format(
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
