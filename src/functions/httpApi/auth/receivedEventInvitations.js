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
  const nextTokenParts = nextToken ? nextToken.split('___') : null;

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(
          query.Index('eventInvitationsByUserStatus'),
          authUser.id,
          'pending'
        ),
        {
          size: 20,
          after: nextTokenParts
            ? [
                nextTokenParts[0],
                nextTokenParts[1],
                query.Ref(
                  query.Collection('eventInvitations'),
                  nextTokenParts[2]
                )
              ]
            : []
        }
      ),
      query.Lambda(['eventId', 'inviterId', 'ref'], {
        invitation: query.Get(query.Var('ref')),
        event: getById('_events', query.Var('eventId')),
        inviter: getById('users', query.Var('inviterId'))
      })
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(
        ({ invitation, event, inviter: _inviter }) => {
          const inviter = getPublicUserData(_inviter);

          return {
            ...invitation.data,
            id: invitation.ref.id,
            event: {
              ...event.data,
              id: event.ref.id,
              invitationId: invitation.ref.id,
              inviter
            },
            inviter
          };
        }
      ),
      nextToken: result.after
        ? `${result.after[0]}___${result.after[1]}___${result.after[2].id}`
        : null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
