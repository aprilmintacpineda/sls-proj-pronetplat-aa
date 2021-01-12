const { query } = require('faunadb');

const jwt = require('/opt/nodejs/utils/jwt');
const RegisteredDevice = require('/opt/nodejs/utils/jwt');

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
        invalidAt: query.Now()
      }
    });
  } catch (error) {
    console.log(error);
  }
};
