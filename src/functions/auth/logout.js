const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const { invokeEvent } = require('dependencies/utils/lambda');

module.exports.handler = async ({ headers }) => {
  try {
    const { authToken, deviceToken } = checkRequiredHeaderValues(
      headers
    );

    const { data: authUser } = await jwt.verify(authToken);

    await invokeEvent({
      functionName: process.env.fn_forceExpireDeviceToken,
      payload: {
        deviceToken,
        userId: authUser.id
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
