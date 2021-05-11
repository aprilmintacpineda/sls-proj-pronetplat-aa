const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ authUser, params: { nextToken } }) {
  const client = initClient();

  const result = await client.query(
    query.Map(
      query.Paginate(
        query.Join(
          query.Match(
            query.Index('userBlockingsByBlockerId'),
            authUser.id
          ),
          query.Lambda(
            ['userId', 'ref'],
            query.Match(
              query.Index('userRefSortedByFullName'),
              query.Ref(
                query.Collection('users'),
                query.Var('userId')
              )
            )
          )
        ),
        {
          size: 20,
          after: nextToken
            ? query.Ref(query.Collection('userBlockings'), nextToken)
            : []
        }
      ),
      query.Lambda(
        ['firstName', 'middleName', 'surname', 'ref'],
        query.Get(query.Var('ref'))
      )
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(document => ({
        ...document.data,
        id: document.ref.id
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
