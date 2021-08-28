const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ authUser, params: { nextToken } }) {
  const faunadb = initClient();
  const nextTokenParts = nextToken ? nextToken.split('___') : null;

  const result = await faunadb.query(
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
          after: nextTokenParts
            ? [
                nextTokenParts[0],
                nextTokenParts[1],
                nextTokenParts[2],
                query.Ref(
                  query.Collection('users'),
                  nextTokenParts[3]
                )
              ]
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
      nextToken: result.after
        ? `${result.after[0]}___${result.after[1]}___${result.after[2]}___${result.after[3].id}`
        : null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
