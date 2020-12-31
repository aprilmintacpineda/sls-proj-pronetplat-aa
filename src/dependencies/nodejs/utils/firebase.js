const fs = require('fs').promises;
const firebaseAdmin = require('firebase-admin');
const path = require('path');

module.exports.isValidDeviceToken = async deviceToken => {
  const configPath = path.join(__dirname, '../resources/firebase_admin.json');

  const file = await fs.readFile(configPath, 'utf-8');

  console.log(file.toString());

  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(configPath)
  });

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

  return Boolean(notifResult.error);
};
