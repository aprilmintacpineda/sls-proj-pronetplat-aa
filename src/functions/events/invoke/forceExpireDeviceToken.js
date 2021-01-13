const jwt = require('/opt/nodejs/utils/jwt');
const RegisteredDevice = require('/opt/nodejs/utils/jwt');
const { getTimeOffset } = require('/opt/nodejs/utils/faunadb');

module.exports.handler = async ({ authToken, deviceToken }) => {
  try {
    const {
      data: { id }
    } = jwt.decode(authToken);
    const registeredDevice = new RegisteredDevice();

    await registeredDevice.updateByIndex({
      index: 'registeredDeviceByUserIdDeviceToken',
      args: [id, deviceToken],
      data: {
        expiresAt: getTimeOffset(true)
      }
    });
  } catch (error) {
    console.log('error', error);
  }
};
