const path = require('path');
const firebaseAdmin = require('firebase-admin');

const configPath = path.join(
  __dirname,
  '../resources/firebase_admin.json'
);

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(configPath)
});

module.exports.isValidDeviceToken = async deviceToken => {
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
};

module.exports.sendPushNotification = ({
  tokens,
  notification,
  data
}) => {
  return firebaseAdmin
    .messaging()
    .sendToDevice(
      tokens,
      { notification, data },
      { priority: 'high' }
    );
};
