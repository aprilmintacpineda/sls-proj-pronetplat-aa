const { query } = require('faunadb');
const { sendPushNotification } = require('/opt/nodejs/utils/firebase');
const { initClient } = require('/opt/nodejs/utils/faunadb');

module.exports.handler = async ({ userId, notification, data }) => {
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
      notification,
      data
    });
  } catch (error) {
    console.log(error);
  }
};
