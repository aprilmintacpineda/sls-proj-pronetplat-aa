const { query } = require('faunadb');
const {
  initClient,
  getById,
  existsByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ params: { nextToken }, authUser }) {
  const faunadb = initClient();
  const nextTokenParts = nextToken ? nextToken.split('___') : null;

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Union(
          query.Match(
            query.Index('eventsByEventOrganizer'),
            authUser.id
          ),
          query.Match(query.Index('eventsByAttendee'), authUser.id)
        ),
        {
          size: 20,
          after: nextTokenParts
            ? [
                nextTokenParts[0],
                query.Ref(
                  query.Collection('eventOrganizers'),
                  nextTokenParts[1]
                )
              ]
            : []
        }
      ),
      query.Lambda(['eventId', 'ref'], {
        event: getById('_events', query.Var('eventId')),
        isGoing: existsByIndex(
          'eventAttendeeByUserEvent',
          authUser.id,
          query.Var('eventId')
        ),
        isOrganizer: existsByIndex(
          'eventOrganizerByOrganizerEvent',
          authUser.id,
          query.Var('eventId')
        )
      })
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(({ event, isOrganizer, isGoing }) => ({
        id: event.ref.id,
        ...event.data,
        isGoing,
        isOrganizer
      })),
      nextToken: result.after
        ? `${result.after[0]}___${result.after[1].id}`
        : null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
