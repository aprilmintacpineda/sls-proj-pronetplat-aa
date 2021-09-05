const { query } = require('faunadb');
const {
  initClient,
  create,
  getById,
  updateById
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
      query.If(
        query.Not(
          query.ContainsPath(
            ['data', 'commentId'],
            getById('eventComments', commentId)
          )
        ),
        query.Let(
          {
            comment: updateById('eventComments', commentId, {
              numReplies: query.Add(
                query.Select(
                  ['data', 'numReplies'],
                  getById('eventComments', commentId),
                  0
                ),
                1
              )
            }),
            userId: query.Select(
              ['data', 'userId'],
              query.Var('comment')
            ),
            eventId: query.Select(
              ['data', 'eventId'],
              query.Var('comment')
            )
          },
          {
            eventId: query.Var('eventId'),
            userId: query.Var('userId'),
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
      title: 'New replied to a comment',
      type: 'replyOnComment',
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
