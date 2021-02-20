const RegisteredDevice = require('dependencies/models/RegisteredDevice');

module.exports.handler = async ({ deviceToken, userId }) => {
  const registeredDevice = new RegisteredDevice();

  await registeredDevice.hardDeleteByIndex(
    'registeredDeviceByUserIdDeviceToken',
    userId,
    deviceToken
  );
};
