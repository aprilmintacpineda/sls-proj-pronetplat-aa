const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ params: { nextToken }, authUser }) {
  const client = initClient();

  const result = await client.query(
    query.Paginate(
      query.Map(
        query.Match(query.Index('contactsByUserId'), authUser.id),
        query.Lambda(
          ['numTimesOpened', 'contactId', 'ref'],
          getById('users', query.Var('contactId'))
        )
      ),
      {
        size: 20,
        after: nextToken
          ? query.Ref(query.Collection('contacts'), nextToken)
          : []
      }
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(user => getPublicUserData(user)),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
