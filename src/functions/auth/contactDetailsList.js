const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');

async function handler ({ authUser, nextToken }) {
  const faunadb = initClient();

  const result = await faunadb.query(
    query.Paginate(
      query.Match(
        query.Index('contactDetailsByUserId'),
        authUser.id
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
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ]
});
