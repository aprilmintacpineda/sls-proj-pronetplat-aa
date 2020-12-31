const { query } = require('faunadb');
// const { sendPushNotification } = require('/opt/nodejs/utils/firebase');
const { initClient } = require('/opt/nodejs/utils/faunadb');

module.exports.handler = async ({ userId }) => {
  try {
    const client = initClient();

    const registeredDevices = await client.query(
      query.Map(
        query.Paginate(query.Match(query.Index(this.indexes.list), userId)),
        query.Lambda(['ref'], query.Get(query.Var('ref')))
      )
    );

    console.log(registeredDevices);
  } catch (error) {
    console.log(error);
  }
};
