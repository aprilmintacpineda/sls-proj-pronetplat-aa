const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ params: { nextToken }, authUser }) {
  const faunadb = initClient();

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(
          query.Index('contactRequestsByRecipientId'),
          authUser.id
        ),
        {
          size: 20,
          after: nextToken
            ? query.Ref(
                query.Collection('contactRequests'),
                nextToken
              )
            : []
        }
      ),
      query.Lambda(['senderId', 'ref'], {
        contactRequest: query.Get(query.Var('ref')),
        sender: getById('users', query.Var('senderId'))
      })
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(({ contactRequest, sender }) => ({
        ...contactRequest.data,
        id: contactRequest.ref.id,
        sender: getPublicUserData(sender)
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
