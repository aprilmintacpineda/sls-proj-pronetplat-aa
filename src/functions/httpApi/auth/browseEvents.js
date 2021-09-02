const { query } = require('faunadb');
const {
  initClient,
  existsByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

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
      method = 'km',
      maxDistance = 25
    },
    authUser
  },
  { headers }
) {
  if (
    !schedule ||
    (schedule !== 'future' &&
      schedule !== 'past' &&
      schedule !== 'present')
  )
    return { statusCode: 400 };

  const lat = _lat || headers['CloudFront-Viewer-Latitude'];
  const lng = _lng || headers['CloudFront-Viewer-Longitude'];

  if (!lat || !lng) return { statusCode: 400 };

  const faunadb = initClient();
  const nextTokenParts = nextToken ? nextToken.split('___') : null;
  const unit = method === 'km' ? 6371 : 3959;

  const result = await faunadb.query(
    query.Map(
      query.Filter(
        query.Paginate(
          query.Match(
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
        ),
        query.Lambda(
          [
            'startDateTime',
            'endDateTime',
            'latitude',
            'longitude',
            'ref'
          ],
          query.And(
            query.LTE(
              query.Multiply(
                unit,
                query.Acos(
                  query.Add(
                    query.Multiply(
                      query.Cos(query.Radians(Number(lat))),
                      query.Cos(
                        query.Radians(query.Var('latitude'))
                      ),
                      query.Cos(
                        query.Subtract(
                          query.Radians(query.Var('longitude')),
                          query.Radians(Number(lng))
                        )
                      )
                    ),
                    query.Multiply(
                      query.Sin(query.Radians(Number(lat))),
                      query.Sin(query.Radians(query.Var('latitude')))
                    )
                  )
                )
              ),
              maxDistance
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
          )
        )
      ),
      query.Lambda(
        [
          'startDateTime',
          'endDateTime',
          'latitude',
          'longitude',
          'ref'
        ],
        {
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
          unit *
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
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
