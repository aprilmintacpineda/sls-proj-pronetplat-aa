const RegisteredDevice = require('dependencies/nodejs/models/RegisteredDevice');
const jwt = require('dependencies/nodejs/utils/jwt');

module.exports.handler = async ({ authToken, deviceToken }) => {
  try {
    const { data: authUser } = jwt.decode(authToken);
    const registeredDevice = new RegisteredDevice();

    await registeredDevice.hardDeleteByIndex(
      'registeredDeviceByUserIdDeviceToken',
      authUser.id,
      deviceToken
    );
  } catch (error) {
    console.log('error', error);
  }
};
