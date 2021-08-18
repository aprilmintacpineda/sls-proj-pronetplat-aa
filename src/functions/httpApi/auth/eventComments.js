const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ authUser, params: { eventId } }) {
  const faunadb = initClient();
  let result = null;

  try {
    result = await faunadb.query(
      query.Let(
        {
          _event: getById('_events', eventId)
        },
        query.If(
          query.And(
            query.Equals(
              query.Select(['data', 'status'], query.Var('_event')),
              'published'
            ),
            query.Or(
              query.Equals(
                query.Select(
                  ['data', 'visibility'],
                  query.Var('_event')
                ),
                'public'
              ),
              existsByIndex(
                'eventAttendeeByUserEvent',
                authUser.id,
                eventId
              )
            )
          ),
          query.Map(
            query.Paginate(
              query.Match(query.Index('commentsByEvent'), eventId)
            ),
            query.Lambda(
              ['ref'],
              query.Let(
                {
                  comment: query.Get(query.Var('ref'))
                },
                {
                  comment: query.Var('comment'),
                  user: getById(
                    'users',
                    query.Select(
                      ['data', 'userId'],
                      query.Var('comment')
                    )
                  )
                }
              )
            )
          ),
          query.Abort('ValidationError')
        )
      )
    );
  } catch (error) {
    console.log('error', error);

    if (error.description === 'ValidationError')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  console.log(JSON.stringify(result));

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(({ comment, user }) => ({
        id: comment.ref.id,
        ...comment.data,
        user: getPublicUserData(user)
      })),
      nextToken: null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
