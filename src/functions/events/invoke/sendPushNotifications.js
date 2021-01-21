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

      await sendPushNotification({
        tokens: result.data.map(
          ({ data: { deviceToken } }) => deviceToken
        ),
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
