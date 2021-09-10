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
    query.Reduce(
      query.Lambda(
        ['accumulator', 'values'], // ['eventId', 'userId', 'ref']
        query.Let(
          {
            event: getById(
              '_events',
              query.Select([0], query.Var('values'))
            )
          },
          query.If(
            query.LT(
              query.Time(
                query.Select(
                  ['data', 'startDateTime'],
                  query.Var('event')
                )
              ),
              query.Now()
            ),
            query.Var('accumulator'),
            query.Append(
              {
                invitation: query.Get(
                  query.Select([2], query.Var('values'))
                ),
                event: query.Var('event'),
                inviter: getById(
                  'users',
                  query.Select([1], query.Var('values'))
                )
              },
              query.Var('accumulator')
            )
          )
        )
      ),
      [],
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
      )
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data[0].map(
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
