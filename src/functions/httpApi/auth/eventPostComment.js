const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
  getById,
  create
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody, params: { eventId } }) {
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
          {
            eventComment: create('eventComments', {
              userId: authUser.id,
              eventId,
              comment: formBody.comment
            }),
            organizers: query.Map(
              query.Paginate(
                query.Match(
                  query.Index('eventOrganizersByEvent'),
                  eventId
                ),
                { size: 20 }
              ),
              query.Lambda(['userId', 'ref'], query.Var('userId'))
            )
          },
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

  await Promise.all(
    result.organizers.data.map(userId => {
      if (userId === authUser.id) return null;

      return createNotification({
        authUser,
        recipientId: userId,
        body: '{fullname} posted a comment on {eventName}',
        title: 'Commented on your event',
        type: 'commentedOnEvent',
        payload: { eventId }
      });
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      id: result.eventComment.ref.id,
      ...result.eventComment.data
    })
  };
}

module.exports = httpGuard({
  handler,
  formValidator: ({ comment }) =>
    validate(comment, ['required', 'maxLength:3000']),
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
