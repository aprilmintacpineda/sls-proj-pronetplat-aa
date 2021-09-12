const { query } = require('faunadb');
const {
  initClient,
  existsByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const validate = require('dependencies/utils/validate');

async function handler ({
  params: { nextToken, schedule },
  authUser
}) {
  const faunadb = initClient();
  const nextTokenParts = nextToken ? nextToken.split('___') : null;

  const result = await faunadb.query(
    query.Reduce(
      query.Lambda(
        ['accumulator', 'values'], // ['startDateTime', 'endDateTime', 'ref']
        query.Let(
          {
            startDateTime: query.Select([0], query.Var('values')),
            endDateTime: query.Select([1], query.Var('values')),
            ref: query.Select([2], query.Var('values'))
          },
          query.If(
            schedule === 'past'
              ? query.And(
                  query.LT(
                    query.Time(query.Var('startDateTime')),
                    query.Now()
                  ),
                  query.LT(
                    query.Time(query.Var('endDateTime')),
                    query.Now()
                  )
                )
              : schedule === 'future'
              ? query.GT(
                  query.Time(query.Var('startDateTime')),
                  query.Now()
                )
              : query.And(
                  query.LTE(
                    query.Time(query.Var('startDateTime')),
                    query.Now()
                  ),
                  query.GTE(
                    query.Time(query.Var('endDateTime')),
                    query.Now()
                  )
                ),
            query.Append(
              {
                event: query.Get(query.Var('ref')),
                isGoing: true,
                isOrganizer: existsByIndex(
                  'eventOrganizerByOrganizerEvent',
                  authUser.id,
                  query.Select(['id'], query.Var('ref'))
                )
              },
              query.Var('accumulator')
            ),
            query.Var('accumulator')
          )
        )
      ),
      [],
      query.Paginate(
        query.Join(
          query.Union(
            query.Match(
              query.Index('eventsByEventOrganizer'),
              authUser.id
            ),
            query.Match(
              query.Index('eventsByAttendeeStatus'),
              authUser.id,
              'active'
            )
          ),
          query.Lambda(
            ['eventId', 'ref'],
            query.Match(
              query.Index('eventsSortedByDateTime'),
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
                nextTokenParts[1],
                query.Ref(
                  query.Collection('eventOrganizers'),
                  nextTokenParts[2]
                )
              ]
            : []
        }
      )
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data[0].map(
        ({ event, isOrganizer, isGoing }) => ({
          id: event.ref.id,
          ...event.data,
          isGoing,
          isOrganizer
        })
      ),
      nextToken: result.after
        ? `${result.after[0]}___${result.after[1]}___${result.after[2].id}`
        : null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  queryParamsValidator: ({ schedule }) =>
    validate(schedule, ['required', 'options:past,present,future'])
});
