const { query } = require('faunadb');
const {
  initClient,
  create,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');
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
          }),
          organizers: query.Map(
            query.Paginate(
              query.Match(
                query.Index('eventOrganizersByEvent'),
                query.Var('eventId')
              ),
              { size: 20 }
            ),
            query.Lambda(['userId', 'ref'], query.Var('userId'))
          )
        }
      )
    );
  } catch (error) {
    console.log('error', error);
    return { statusCode: 500 };
  }

  await Promise.all(
    result.organizers.data.map(userId => {
      if (userId === authUser.id) return null;

      return createNotification({
        authUser,
        recipientId: userId,
        body: '{fullname} replied to {userFullNamePossessive} comment on {eventName}',
        title: 'Replied to a comment',
        type: 'replyOnComment',
        payload: {
          eventId: result.eventId,
          userId: result.userId
        }
      });
    })
  );

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
