const validate = require('/opt/nodejs/utils/validate');
const jwt = require('/opt/nodejs/utils/jwt');
const { invokeEvent } = require('/opt/nodejs/utils/lambda');
const { getAuthTokenFromHeaders } = require('/opt/nodejs/utils/helpers');
const User = require('/opt/nodejs/models/User');

function hasError ({ deviceToken }) {
  return validate(deviceToken, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  const formBody = JSON.parse(body);
  const authToken = getAuthTokenFromHeaders(headers);

  try {
    if (hasError(formBody)) throw new Error('invalid form body');
    const {
      data: { id }
    } = await jwt.verify(authToken);

    const user = new User();
    await user.getById(id);

    const authUser = user.toResponseData();
    const newAuthToken = await jwt.sign(authUser);

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
          deviceToken: formBody.deviceToken,
          authToken
        }
      });
    }
  }

  return { statusCode: 403 };
};
