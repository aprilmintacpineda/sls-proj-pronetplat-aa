const { query } = require('faunadb');
const firebaseAdmin = require('firebase-admin');

const validate = require('/opt/nodejs/utils/validate');
const jwt = require('/opt/nodejs/utils/jwt');
const { verifyHash } = require('/opt/nodejs/utils/helpers');
const User = require('/opt/nodejs/models/User');
const RegisteredDevices = require('/opt/nodejs/models/RegisteredDevices');

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
    if (hasErrors(formBody)) return { statusCode: 403 };

    const { email, password, deviceToken } = formBody;
    const user = new User();
    await user.getByEmail(email);

    if (!await verifyHash(password, user.data.hashedPassword))
      throw new Error('Incorrect password');

    const {
      results: [notifResult]
    } = await firebaseAdmin.messaging().sendToDevice(
      deviceToken,
      {
        notification: {
          title: 'Device Registration',
          message: 'Your device has been registered.'
        }
      },
      {
        dryRun: true
      }
    );

    if (notifResult.error) return { statusCode: 403 };

    const registeredDevice = new RegisteredDevices();

    await user.update({ lastLoginAt: query.Now() });

    await registeredDevice.create({
      userId: user.data.id,
      deviceToken
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
