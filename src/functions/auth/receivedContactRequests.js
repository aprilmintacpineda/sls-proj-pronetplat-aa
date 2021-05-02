const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
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
        query.Match(
          query.Index('contactRequestsByRecipientId'),
          authUser.id
        ),
        query.Lambda(['senderId', 'ref'], {
          contactRequest: query.Get(query.Var('ref')),
          sender: query.Get(
            query.Ref(
              query.Collection('users'),
              query.Var('senderId')
            )
          )
        })
      ),
      {
        size: 20,
        after: nextToken
          ? query.Ref(query.Collection('contactRequests'), nextToken)
          : []
      }
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

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
