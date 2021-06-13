const { query } = require('faunadb');
const {
  initClient,
  getByIndex,
  update
} = require('dependencies/utils/faunadb');

module.exports = async ({ contactId, authUser }) => {
  const faunadb = initClient();

  await faunadb.query(
    query.Let(
      {
        contact: getByIndex(
          'contactByOwnerContact',
          authUser.id,
          contactId
        )
      },
      update(query.Select(['ref'], query.Var('contact')), {
        numTimesOpened: query.Add(
          query.Select(
            ['data', 'numTimesOpened'],
            query.Var('contact')
          ),
          1
        )
      })
    )
  );
};
