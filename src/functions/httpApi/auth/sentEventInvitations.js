const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ params: { nextToken }, authUser }) {
  const faunadb = initClient();

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(
          query.Index('eventInvitationsByInviter'),
          authUser.id
        ),
        {
          size: 20,
          after: nextToken
            ? query.Ref(
                query.Collection('eventInvitations'),
                nextToken
              )
            : []
        }
      ),
      query.Lambda(['eventId', 'userId', 'ref'], {
        invitation: query.Get(query.Var('ref')),
        event: getById('_events', query.Var('eventId')),
        invitee: getById('users', query.Var('userId'))
      })
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(
        ({ invitation, event, invitee: _invitee }) => {
          const invitee = getPublicUserData(_invitee);

          return {
            ...invitation.data,
            id: invitation.ref.id,
            event: {
              ...event.data,
              id: event.ref.id,
              invitationId: invitation.ref.id,
              invitee
            },
            invitee
          };
        }
      ),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
