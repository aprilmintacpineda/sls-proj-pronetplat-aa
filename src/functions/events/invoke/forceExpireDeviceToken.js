const {
  getTimeOffset
} = require('dependencies/nodejs/utils/faunadb');
const jwt = require('dependencies/nodejs/utils/jwt');
const RegisteredDevice = require('dependencies/nodejs/utils/jwt');

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
