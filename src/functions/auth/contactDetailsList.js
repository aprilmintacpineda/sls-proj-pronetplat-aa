const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');

async function handler ({ authUser, params: { nextToken } }) {
  const faunadb = initClient();

  const result = await faunadb.query(
    query.Paginate(
      query.Map(
        query.Match(
          query.Index('contactDetailsByUserId'),
          authUser.id
        ),
        query.Lambda(['ref'], query.Get(query.Var('ref')))
      ),
      {
        size: 20,
        after: nextToken
          ? query.Ref(query.Collection('contactDetails'), nextToken)
          : []
      }
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(contactDetail => ({
        ...contactDetail.data,
        id: contactDetail.ref.id
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
