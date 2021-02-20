const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const { invokeEvent } = require('dependencies/utils/lambda');

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

  await invokeEvent({
    functionName: process.env.fn_forceExpireDeviceToken,
    payload: {
      deviceToken: headerValues.deviceToken,
      userId: authUser.id
    }
  });

  return { statusCode: 200 };
};
