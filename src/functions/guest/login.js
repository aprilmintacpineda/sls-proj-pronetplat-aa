const { query } = require('faunadb');

const validate = require('/opt/nodejs/utils/validate');
const jwt = require('/opt/nodejs/utils/jwt');
const { isValidDeviceToken } = require('/opt/nodejs/utils/firebase');
const { verifyHash } = require('/opt/nodejs/utils/helpers');
const User = require('/opt/nodejs/models/User');
const RegisteredDevice = require('/opt/nodejs/models/RegisteredDevice');

function hasErrors ({ email, password, deviceToken }) {
  return (
    validate(email, ['required', 'email']) ||
    validate(password, ['required', 'maxLength:30']) ||
    validate(deviceToken, ['required'])
  );
}

module.exports.handler = async ({ body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    const { email, password, deviceToken } = formBody;
    const user = new User();
    await user.getByEmail(email);

    if (!await verifyHash(password, user.data.hashedPassword))
      throw new Error('Incorrect password');

    if (!await isValidDeviceToken(deviceToken)) throw new Error('Invalid deviceToken.');

    const registeredDevice = new RegisteredDevice();
    await user.update({ lastLoginAt: query.Now() });

    await registeredDevice.createOrUpdate({
      index: 'registeredDeviceByUserIdDeviceToken',
      args: [user.data.id, deviceToken],
      data: {
        userId: user.data.id,
        deviceToken,
        expiresAt: query.TimeAdd(query.Now(), 7, 'days')
      }
    });

    const authUser = user.toResponseData();
    const authToken = await jwt.sign(authUser);

    return {
      statusCode: 200,
      body: JSON.stringify({
        authToken,
        authUser
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
