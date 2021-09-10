const { query } = require('faunadb');
const {
  initClient,
  existsByIndex
} = require('dependencies/utils/faunadb');
const { cleanExtraSpaces } = require('dependencies/utils/helpers');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const validate = require('dependencies/utils/validate');

function toRadians (degrees) {
  return (degrees * Math.PI) / 180;
}

async function handler (
  {
    params: {
      nextToken,
      schedule,
      lat: _lat,
      lng: _lng,
      unit = 'kilometers',
      maxDistance,
      search
    },
    authUser
  },
  { headers }
) {
  const lat = Number(_lat || headers['CloudFront-Viewer-Latitude']);
  const lng = Number(_lng || headers['CloudFront-Viewer-Longitude']);
  if (!lat || !lng) return { statusCode: 400 };

  const faunadb = initClient();
  const nextTokenParts = nextToken ? nextToken.split('___') : null;
  const unitConstant = unit === 'kilometers' ? 6371 : 3959;

  const result = await faunadb.query(
    query.Reduce(
      query.Lambda(
        ['accumulator', 'values'], // [ 'startDateTime', 'endDateTime', 'latitude', 'longitude', 'ref' ]
        query.Let(
          {
            startDateTime: query.Select([0], query.Var('values')),
            endDateTime: query.Select([1], query.Var('values')),
            latitude: query.Select([2], query.Var('values')),
            longitude: query.Select([3], query.Var('values')),
            ref: query.Select([4], query.Var('values'))
          },
          query.if(
            query.And(
              query.LTE(
                query.Multiply(
                  unitConstant,
                  query.Acos(
                    query.Add(
                      query.Multiply(
                        query.Cos(query.Radians(lat)),
                        query.Cos(
                          query.Radians(query.Var('latitude'))
                        ),
                        query.Cos(
                          query.Subtract(
                            query.Radians(query.Var('longitude')),
                            query.Radians(lng)
                          )
                        )
                      ),
                      query.Multiply(
                        query.Sin(query.Radians(lat)),
                        query.Sin(
                          query.Radians(query.Var('latitude'))
                        )
                      )
                    )
                  )
                ),
                Number(maxDistance)
              ),
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
                  )
            ),
            query.Append(
              {
                event: query.Get(query.Var('ref')),
                isGoing: existsByIndex(
                  'eventAttendeeByUserEventStatus',
                  authUser.id,
                  query.Select(['id'], query.Var('ref')),
                  'active'
                ),
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
        search
          ? query.Intersection(
              query.Union(
                ...cleanExtraSpaces(search, false)
                  .toLowerCase()
                  .split(/\s/)
                  .map(slug =>
                    query.Map(
                      query.NGram(slug, 2, 3),
                      query.Lambda(
                        ['needle'],
                        query.Match(
                          query.Index('searchEvents'),
                          query.Var('needle'),
                          'public',
                          'published'
                        )
                      )
                    )
                  )
              )
            )
          : query.Match(
              query.Index('eventsByVisibilityStatus'),
              'public',
              'published'
            ),
        {
          size: 20,
          after: nextTokenParts
            ? [
                nextTokenParts[0],
                nextTokenParts[1],
                nextTokenParts[2],
                nextTokenParts[3],
                query.Ref(
                  query.Collection('eventOrganizers'),
                  nextTokenParts[4]
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
      data: result.data.map(({ event, isOrganizer, isGoing }) => ({
        id: event.ref.id,
        ...event.data,
        isGoing,
        isOrganizer,
        distance:
          unitConstant *
          Math.acos(
            Math.cos(toRadians(event.data.latitude)) *
              Math.cos(toRadians(lat)) *
              Math.cos(
                toRadians(lng) - toRadians(event.data.longitude)
              ) +
              Math.sin(toRadians(event.data.latitude)) *
                Math.sin(toRadians(lat))
          )
      })),
      nextToken: result.after
        ? `${result.after[0]}___${result.after[1]}___${result.after[2]}___${result.after[3]}___${result.after[4].id}`
        : null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  queryParamsValidator: ({
    schedule,
    unit,
    maxDistance,
    search
  }) => {
    return (
      validate(search, ['maxLength:255']) ||
      validate(schedule, [
        'required',
        'options:past,present,future'
      ]) ||
      validate(unit, ['required', 'options:kilometers,miles']) ||
      validate(maxDistance, ['required', 'integer'])
    );
  }
});
