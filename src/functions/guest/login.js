const { query } = require('faunadb');
const RegisteredDevice = require('dependencies/nodejs/models/RegisteredDevice');
const User = require('dependencies/nodejs/models/User');
const {
  isValidDeviceToken
} = require('dependencies/nodejs/utils/firebase');
const { verifyHash } = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const validate = require('dependencies/nodejs/utils/validate');

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

    if (!(await verifyHash(password, user.data.hashedPassword)))
      throw new Error('Incorrect password');

    if (!(await isValidDeviceToken(deviceToken)))
      throw new Error('Invalid deviceToken.');

    const registeredDevice = new RegisteredDevice();
    const authUser = user.toResponseData();

    const [authToken] = await Promise.all([
      jwt.sign(authUser),
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
