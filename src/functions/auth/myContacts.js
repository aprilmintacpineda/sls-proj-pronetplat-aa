const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');

async function handler ({ params: { nextToken }, authUser }) {
  const client = initClient();

  const result = await client.query(
    query.Map(
      query.Paginate(
        query.Match(query.Index('contactsByUserId'), authUser.id),
        {
          size: 20,
          after: nextToken
            ? query.Ref(query.Collection('contacts'), nextToken)
            : []
        }
      ),
      query.Lambda(
        ['numTimesOpened', 'contactId', 'ref'],
        query.Get(
          query.Ref(
            query.Collection('users'),
            query.Var('contactId')
          )
        )
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
