const { query } = require('faunadb');
const RegisteredDevice = require('dependencies/nodejs/models/RegisteredDevice');
const User = require('dependencies/nodejs/models/User');
const {
  isValidDeviceToken
} = require('dependencies/nodejs/utils/firebase');
const {
  verifyHash,
  checkRequiredHeaderValues
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ email, password }) {
  return (
    validate(email, ['required', 'email']) ||
    validate(password, ['required', 'maxLength:30'])
  );
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const { deviceToken } = checkRequiredHeaderValues(
      headers,
      false
    );

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    const user = new User();
    await user.getByEmail(formBody.email);

    if (
      !(await verifyHash(
        formBody.password,
        user.data.hashedPassword
      ))
    )
      throw new Error('Incorrect password');

    if (!(await isValidDeviceToken(deviceToken)))
      throw new Error('Invalid deviceToken.');

    const registeredDevice = new RegisteredDevice();

    await Promise.all([
      user.update({ lastLoginAt: query.Format('%t', query.Now()) }),
      registeredDevice.createOrUpdate({
        index: 'registeredDeviceByUserIdDeviceToken',
        args: [user.data.id, deviceToken],
        data: {
          userId: user.data.id,
          deviceToken,
          expiresAt: query.Format(
            '%t',
            query.TimeAdd(query.Now(), 7, 'days')
          )
        }
      })
    ]);

    const userData = user.toResponseData();
    const authToken = await jwt.sign(userData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        authToken,
        userData
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
