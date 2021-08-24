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
            query.Join(
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
              query.Lambda(
                ['eventId', 'ref'],
                query.Match(
                  query.Index('eventsSortedByStartDateTime'),
                  query.Ref(
                    query.Collection('_events'),
                    query.Var('eventId')
                  )
                )
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
          query.Lambda(['startDateTime', 'ref'], {
            event: query.Get(query.Var('ref')),
            isGoing: existsByIndex(
              'eventAttendeeByUserEvent',
              authUser.id,
              query.Select(['id'], query.Var('ref'))
            ),
            isOrganizer: existsByIndex(
              'eventOrganizerByOrganizerEvent',
              authUser.id,
              query.Select(['id'], query.Var('ref'))
            )
          })
        ),
        query.Lambda(
          ['document'],
          schedule === 'past'
            ? query.LT(
                query.Time(
                  query.Select(
                    ['event', 'data', 'startDateTime'],
                    query.Var('document')
                  )
                ),
                query.Now()
              )
            : schedule === 'future'
            ? query.GT(
                query.Time(
                  query.Select(
                    ['event', 'data', 'startDateTime'],
                    query.Var('document')
                  )
                ),
                query.Now()
              )
            : query.And(
                query.LTE(
                  query.Time(
                    query.Select(
                      ['event', 'data', 'startDateTime'],
                      query.Var('document')
                    )
                  ),
                  query.Now()
                ),
                query.GTE(
                  query.Time(
                    query.Select(
                      ['event', 'data', 'endDateTime'],
                      query.Var('document')
                    )
                  ),
                  query.Now()
                )
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
