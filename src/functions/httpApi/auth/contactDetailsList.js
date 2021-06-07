const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ authUser, params: { nextToken } }) {
  const faunadb = initClient();

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(
          query.Index('contactDetailsByUserId'),
          authUser.id
        ),
        {
          size: 20,
          after: nextToken
            ? query.Ref(
                query.Collection('contactDetails'),
                nextToken
              )
            : []
        }
      ),
      query.Lambda(['ref'], query.Get(query.Var('ref')))
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
