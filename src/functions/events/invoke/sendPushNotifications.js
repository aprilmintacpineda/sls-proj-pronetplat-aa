const { query } = require('faunadb');
const {
  sendPushNotification
} = require('/opt/nodejs/utils/firebase');
const { initClient } = require('/opt/nodejs/utils/faunadb');

module.exports.handler = async ({
  userId,
  title,
  body,
  imageUrl,
  type,
  data
}) => {
  try {
    const client = initClient();
    let nextToken = '';

    do {
      const result = await client.query(
        query.Call('getActiveRegisteredDevices', userId, nextToken)
      );

      const tokens = result.data.map(
        ({ data: { deviceToken } }) => deviceToken
      );

      await sendPushNotification({
        tokens,
        notification: {
          title,
          body,
          imageUrl
        },
        data: {
          ...data,
          type
        }
      });

      nextToken = result.after?.[0].id;
    } while (nextToken);
  } catch (error) {
    console.log('error', error);
  }
};
