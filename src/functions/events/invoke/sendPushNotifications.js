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
    let nextToken = null;

    do {
      const result = await client.query(
        query.Call('getActiveRegisteredDevices', userId, nextToken)
      );

      const tokens = result.data.reduce((accumulator, current) => {
        if (!hasTimePassed(current.expiresAt)) return accumulator;
        return accumulator.concat(current.data.deviceToken);
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

      nextToken = result.after?.[0].id;
    } while (nextToken);
  } catch (error) {
    console.log('error', error);
  }
};
