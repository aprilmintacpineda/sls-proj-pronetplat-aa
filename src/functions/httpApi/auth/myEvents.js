const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ params: { nextToken }, authUser }) {
  const faunadb = initClient();

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(
          query.Index('eventsByEventOrganizer'),
          authUser.id
        ),
        {
          size: 20,
          after: nextToken
            ? query.Ref(
                query.Collection('eventsByEventOrganizer'),
                nextToken
              )
            : []
        }
      ),
      query.Lambda(['eventId', 'ref'], {
        event: getById('_events', query.Var('eventId')),
        organizers: query.Map(
          query.Paginate(
            query.Match(
              query.Index('eventOrganizersByEvent'),
              query.Var('eventId')
            )
          ),
          query.Lambda(
            ['userId', 'ref'],
            getById('users', query.Var('userId'))
          )
        )
      })
    )
  );

  console.log(JSON.stringify(result));

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: [],
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
