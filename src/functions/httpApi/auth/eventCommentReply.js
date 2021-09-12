const { query } = require('faunadb');
const {
  initClient,
  create,
  getById,
  updateById,
  existsByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { invokeEvent } = require('dependencies/utils/invokeLambda');
const validate = require('dependencies/utils/validate');

async function handler ({
  authUser,
  formBody,
  params: { commentId }
}) {
  const faunadb = initClient();
  let result = null;

  try {
    result = await faunadb.query(
      query.Let(
        {
          comment: getById('eventComments', commentId),
          eventId: query.Select(
            ['data', 'eventId'],
            query.Var('comment')
          ),
          _event: getById('_events', query.Var('eventId'))
        },
        query.If(
          query.And(
            query.Not(
              query.ContainsPath(
                ['data', 'commentId'],
                query.Var('comment')
              )
            ),
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
                'eventOrganizerByOrganizerEvent',
                authUser.id,
                query.Var('eventId')
              ),
              existsByIndex(
                'eventAttendeeByUserEventStatus',
                authUser.id,
                query.Var('eventId'),
                'active'
              )
            )
          ),
          query.Let(
            {
              comment: updateById('eventComments', commentId, {
                numReplies: query.Add(
                  query.Select(
                    ['data', 'numReplies'],
                    query.Var('comment'),
                    0
                  ),
                  1
                )
              })
            },
            {
              eventId: query.Var('eventId'),
              userId: query.Select(
                ['data', 'userId'],
                query.Var('comment')
              ),
              reply: create('eventComments', {
                userId: authUser.id,
                eventId: query.Var('eventId'),
                comment: formBody.comment,
                commentId
              })
            }
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

  await invokeEvent({
    eventName: 'notifyAllEventOrganizers',
    payload: {
      eventId: result.eventId,
      authUser,
      body: '{fullname} replied to {userFullNamePossessive} comment on {eventName}',
      title: 'New reply to a comment on your event',
      type: 'replyOnComment',
      exclude: [authUser.id],
      payload: {
        eventId: result.eventId,
        userId: result.userId
      }
    }
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      id: result.reply.ref.id,
      ...result.reply.data
    })
  };
}

module.exports = httpGuard({
  handler,
  formValidator: ({ comment }) =>
    validate(comment, ['required', 'maxLength:3000']),
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
