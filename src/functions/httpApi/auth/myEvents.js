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

async function handler ({
  params: { nextToken, schedule },
  authUser
}) {
  const faunadb = initClient();
  const nextTokenParts = nextToken ? nextToken.split('___') : null;
  let result = null;

  if (schedule) {
    if (
      schedule !== 'future' &&
      schedule !== 'past' &&
      schedule !== 'present'
    )
      return { statusCode: 400 };

    result = await faunadb.query(
      query.Filter(
        query.Map(
          query.Paginate(
            query.Union(
              query.Match(
                query.Index('eventsByEventOrganizer'),
                authUser.id
              ),
              query.Match(
                query.Index('eventsByAttendee'),
                authUser.id
              )
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
        ),
        query.Lambda(
          ['document'],
          schedule === 'past'
            ? query.LT(
                query.TimeDiff(
                  query.Now(),
                  query.Time(
                    query.Select(
                      ['event', 'data', 'startDateTime'],
                      query.Var('document')
                    )
                  ),
                  'days'
                ),
                0
              )
            : schedule === 'future'
            ? query.GT(
                query.TimeDiff(
                  query.Now(),
                  query.Time(
                    query.Select(
                      ['event', 'data', 'startDateTime'],
                      query.Var('document')
                    )
                  ),
                  'days'
                ),
                0
              )
            : query.Equals(
                query.TimeDiff(
                  query.Now(),
                  query.Time(
                    query.Select(
                      ['event', 'data', 'startDateTime'],
                      query.Var('document')
                    )
                  ),
                  'days'
                ),
                0
              )
        )
      )
    );
  } else {
    result = await faunadb.query(
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
  }

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
