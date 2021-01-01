const { query } = require('faunadb');
const { sendPushNotification } = require('/opt/nodejs/utils/firebase');
const { initClient } = require('/opt/nodejs/utils/faunadb');

module.exports.handler = async ({ userId, title, body, type, data }) => {
  try {
    const client = initClient();

    const { data: tokens } = await client.query(
      query.Map(
        query.Paginate(query.Match(query.Index('registeredDevicesByUserId'), userId)),
        query.Lambda(
          ['ref'],
          query.Select(['data', 'deviceToken'], query.Get(query.Var('ref')))
        )
      )
    );

    await sendPushNotification({
      tokens,
      notification: {
        title,
        body
      },
      data: {
        ...data,
        type
      }
    });
  } catch (error) {
    console.log(error);
  }
};
