const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');

module.exports.handler = async ({ id }) => {
  try {
    const client = initClient();
    const ref = query.Ref(query.Collection('contacts'), id);

    await client.query(
      query.Update(ref, {
        data: {
          numTimesOpened: query.Add(
            query.Select(['data', 'numTimesOpened'], query.Get(ref)),
            1
          )
        }
      })
    );
  } catch (error) {
    console.log('error', error);
  }
};
