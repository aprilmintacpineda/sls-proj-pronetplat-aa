const { query } = require('faunadb');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/firebase');
const {
  hasTimePassed
} = require('dependencies/nodejs/utils/helpers');

module.exports.handler = async ({
  userId,
  title,
  body,
  imageUrl,
  type,
  category,
  data
}) => {
  try {
    const client = initClient();
    let after = null;

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

      const tokens = result.data.reduce((accumulator, data) => {
        const [, , deviceToken, expiresAt] = data;
        if (hasTimePassed(expiresAt)) return accumulator;
        return accumulator.concat(deviceToken);
      }, []);

      await sendPushNotification({
        tokens,
        notification: {
          title,
          body,
          imageUrl
        },
        data: {
          ...data,
          type,
          category
        }
      });

      after = result.after;
    } while (after);
  } catch (error) {
    console.log('error', error);
  }
};
