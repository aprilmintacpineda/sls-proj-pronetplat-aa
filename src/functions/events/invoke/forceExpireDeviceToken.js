const RegisteredDevice = require('dependencies/models/RegisteredDevice');

module.exports.handler = async ({ deviceToken, userId }) => {
  try {
    const registeredDevice = new RegisteredDevice();

    await registeredDevice.hardDeleteByIndex(
      'registeredDeviceByUserIdDeviceToken',
      userId,
      deviceToken
    );
  } catch (error) {
    console.log('error', error);
  }
};
