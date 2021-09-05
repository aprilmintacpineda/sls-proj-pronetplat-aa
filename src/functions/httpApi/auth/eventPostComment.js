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
const { invokeEvent } = require('dependencies/utils/invokeLambda');
const { getPublicUserData } = require('dependencies/utils/users');
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
            })
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

  await invokeEvent({
    eventName: 'notifyAllEventOrganizers',
    payload: {
      eventId,
      authUser,
      body: '{fullname} posted a comment on {eventName}',
      title: 'Commented on your event',
      type: 'commentedOnEvent',
      payload: { eventId }
    }
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      id: result.eventComment.ref.id,
      ...result.eventComment.data,
      user: getPublicUserData({
        ref: {
          id: authUser.id
        },
        data: authUser
      })
    })
  };
}

module.exports = httpGuard({
  handler,
  formValidator: ({ comment }) =>
    validate(comment, ['required', 'maxLength:3000']),
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
