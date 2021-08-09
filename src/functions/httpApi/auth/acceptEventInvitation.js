const { query } = require('faunadb');
const {
  initClient,
  create,
  getById,
  getByIndex,
  selectRef,
  updateById
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
            'eventInvitationByUserEvent',
            authUser.id,
            eventId
          ),
          _event: getById('_events', eventId)
        },
        query.If(
          query.LT(
            query.Select(['data', 'numGoing'], query.Var('_event')),
            query.Select(
              ['data', 'maxAttendees'],
              query.Var('_event')
            )
          ),
          query.Do(
            create('eventAttendees', {
              userId: authUser.id,
              eventId
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
            query.Delete(selectRef(query.Var('invitation'))),
            query.Call(
              'updateUserBadgeCount',
              authUser.id,
              'eventInvitationsCount',
              -1
            ),
            query.Var('invitation')
          ),
          query.Abort('EventIsFull')
        )
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'EventIsFull') {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'EventIsFull'
        })
      };
    }

    return { statusCode: 500 };
  }

  await createNotification({
    authUser,
    userId: invitation.data.inviterId,
    body: '{fullname} has accepted your invitation to join {eventName}',
    title: 'Event invitation accepted',
    type: 'eventInvitationAccepted',
    payload: { eventId }
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
