const { query } = require('faunadb');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/firebase');
const {
  hasTimePassed
} = require('dependencies/nodejs/utils/helpers');

module.exports.handler = async ({ userId, notification, data }) => {
  try {
    const client = initClient();
    let after = null;
    const tokens = [];

    do {
      const result = await client.query(
        query.Paginate(
          query.Match(
            query.Index('registeredDevicesByUserId'),
            userId
          ),
          {
            size: 20,
            after: after || []
          }
        )
      );

      result.data.forEach(([expiresAt, deviceToken]) => {
        if (!hasTimePassed(expiresAt)) tokens.push(deviceToken);
      }, []);

      after = result.after;
    } while (after);

    await sendPushNotification({
      tokens,
      notification,
      data
    });
  } catch (error) {
    console.log('error', error);
  }
};
