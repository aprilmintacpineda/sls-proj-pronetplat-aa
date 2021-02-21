const { query } = require('faunadb');
const { initClient, update } = require('dependencies/utils/faunadb');

module.exports.handler = async ({ id }) => {
  const client = initClient();
  const ref = query.Ref(query.Collection('contacts'), id);

  await client.query(
    update(ref, {
      numTimesOpened: query.Add(
        query.Select(['data', 'numTimesOpened'], query.Get(ref)),
        1
      )
    })
  );
};
