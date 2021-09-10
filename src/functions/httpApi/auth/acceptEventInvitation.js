const { query } = require('faunadb');
const {
  initClient,
  create,
  getById,
  getByIndex,
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

async function handler ({ authUser, params: { eventId } }) {
  const faunadb = initClient();

  let invitation = null;

  try {
    invitation = await faunadb.query(
      query.Let(
        {
          invitation: getByIndex(
            'eventInvitationByUserEventStatus',
            authUser.id,
            eventId,
            'pending'
          ),
          _event: getById('_events', eventId)
        },
        query.If(
          query.And(
            query.LT(
              query.Time(
                query.Select(
                  ['data', 'startDateTime'],
                  query.Var('_event')
                )
              ),
              query.Now()
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
              eventId,
              status: 'active'
            }),
            updateById('_events', eventId, {
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
              eventId,
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
      eventId,
      eventInvitationId: invitation.ref.id
    }
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
