const path = require('path');
const RegisteredDevice = require('dependencies/nodejs/models/RegisteredDevice');
const firebaseAdmin = require('firebase-admin');

const configPath = path.join(
  __dirname,
  '../resources/firebase_admin.json'
);

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(configPath)
});

async function isValidDeviceToken (deviceToken) {
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

  return !notifResult.error;
}

module.exports.isValidDeviceToken = isValidDeviceToken;

async function sendPushNotificationIfValidToken (
  token,
  notification,
  data
) {
  const isValid = isValidDeviceToken(token);
  if (!isValid) {
    const registeredDevice = new RegisteredDevice();
    await registeredDevice.hardDeleteByIndex(
      'registeredDeviceByDeviceToken',
      token
    );
  } else {
    firebaseAdmin.messaging().sendToDevice(
      token,
      { notification, data },
      {
        priority: 'high',
        restrictedPackageName: process.env.appPackageName
      }
    );
  }
}

module.exports.sendPushNotification = ({
  tokens,
  notification,
  data
}) => {
  console.log(tokens);

  if (tokens && tokens.length) {
    return Promise.all(
      tokens.map(token =>
        sendPushNotificationIfValidToken(token, notification, data)
      )
    );
  }
};
