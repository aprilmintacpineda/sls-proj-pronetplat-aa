const { query } = require('faunadb');
const {
  initClient,
  create,
  getById,
  selectRef,
  updateById,
  update
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');

async function handler ({ authUser, params: { invitationId } }) {
  const faunadb = initClient();
  let invitation = null;

  try {
    invitation = await faunadb.query(
      query.Let(
        {
          invitation: getById('eventInvitations', invitationId),
          eventId: query.Select(
            ['data', 'eventId'],
            query.Var('invitation')
          ),
          _event: getById('_events', query.Var('eventId'))
        },
        query.If(
          query.And(
            query.Equals(
              query.Select(
                ['data', 'status'],
                query.Var('invitation')
              ),
              'pending'
            ),
            query.LT(
              query.Now(),
              query.Time(
                query.Select(
                  ['data', 'startDateTime'],
                  query.Var('_event')
                )
              )
            ),
            query.LT(
              query.Select(
                ['data', 'numGoing'],
                query.Var('_event')
              ),
              query.Select(
                ['data', 'maxAttendees'],
                query.Var('_event')
              )
            )
          ),
          query.Do(
            create('eventAttendees', {
              userId: authUser.id,
              eventId: query.Var('eventId'),
              status: 'active'
            }),
            updateById('_events', query.Var('eventId'), {
              numGoing: query.Add(
                query.Select(
                  ['data', 'numGoing'],
                  query.Var('_event')
                ),
                1
              )
            }),
            update(selectRef(query.Var('invitation')), {
              status: 'accepted'
            }),
            query.Call(
              'updateUserBadgeCount',
              authUser.id,
              'eventInvitationsCount',
              -1
            ),
            query.Call(
              'forfeitAllEventInvitations',
              authUser.id,
              query.Var('eventId'),
              null
            ),
            query.Var('invitation')
          ),
          query.Abort('CheckFailed')
        )
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'CheckFailed')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  await createNotification({
    authUser,
    recipientId: invitation.data.inviterId,
    body: '{fullname} has accepted your invitation to join {eventName}',
    title: 'Event invitation accepted',
    type: 'eventInvitationAccepted',
    payload: {
      eventId: invitation.data.eventId,
      eventInvitationId: invitation.ref.id
    }
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
