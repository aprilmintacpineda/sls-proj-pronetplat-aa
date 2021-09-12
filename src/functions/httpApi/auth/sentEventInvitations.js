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
        ['accumulator', 'values'], // ['createdAt', 'eventId', 'userId', 'ref']
        query.Let(
          {
            eventId: query.Select([1], query.Var('values')),
            userId: query.Select([2], query.Var('values')),
            ref: query.Select([3], query.Var('values')),
            event: getById('_events', query.Var('eventId'))
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
                invitation: query.Get(query.Var('ref')),
                event: query.Var('event'),
                invitee: getById('users', query.Var('userId'))
              },
              query.Var('accumulator')
            )
          )
        )
      ),
      [],
      query.Paginate(
        query.Match(
          query.Index('eventInvitationsByInviterStatus'),
          authUser.id,
          'pending'
        ),
        {
          size: 20,
          after: nextTokenParts
            ? [
                nextTokenParts[0],
                nextTokenParts[1],
                nextTokenParts[2],
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
      nextToken: result.after
        ? `${result.after[0]}___${result.after[1]}___${result.after[2]}___${result.after[3].id}`
        : null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
