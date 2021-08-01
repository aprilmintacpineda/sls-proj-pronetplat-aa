const { query } = require('faunadb');
const {
  initClient,
  getById,
  getByIndexIfExists,
  existsByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({
  authUser,
  params: { eventId, search, nextToken }
}) {
  const faunadb = initClient();
  let result;

  if (!search) {
    result = await faunadb.query(
      query.Map(
        query.Paginate(
          query.Match(query.Index('contactsByUserId'), authUser.id),
          {
            size: 20,
            after: nextToken
              ? query.Ref(query.Collection('contacts'), nextToken)
              : []
          }
        ),
        query.Lambda(
          [
            'unreadChatMessagesFromContact',
            'numTimesOpened',
            'contactId',
            'ref'
          ],
          {
            user: getById('users', query.Var('contactId')),
            eventInvitation: getByIndexIfExists(
              'eventInvitationByUserEventInviter',
              query.Var('contactId'),
              eventId,
              authUser.id
            )
          }
        )
      )
    );
  } else {
    result = await faunadb.query(
      query.Map(
        query.Paginate(
          query.Join(
            query.Intersection(
              query.Map(
                query.NGram(search.toLowerCase(), 2, 3),
                query.Lambda(
                  ['needle'],
                  query.Match(
                    query.Index('searchUsersByName'),
                    query.Var('needle')
                  )
                )
              )
            ),
            query.Lambda(
              ['ref'],
              query.Match(
                'contactByOwnerContact',
                authUser.id,
                query.Select(['id'], query.Var('ref'))
              )
            )
          ),
          {
            size: 20,
            after: nextToken
              ? query.Ref(query.Collection('contacts'), nextToken)
              : []
          }
        ),
        query.Lambda(
          ['ref'],
          query.Let(
            {
              contact: query.Get(query.Var('ref')),
              contactId: query.Select(
                ['data', 'contactId'],
                query.Var('contact')
              ),
              user: getById('users', query.Var('contactId'))
            },
            {
              user: query.Var('user'),
              eventInvitation: getByIndexIfExists(
                'eventInvitationByUserEventInviter',
                query.Var('contactId'),
                eventId,
                authUser.id
              ),
              testOnly1: true,
              testOnly2: false,
              testOnly3: 1,
              testOnly4: 0,
              isOrganizer: existsByIndex(
                'eventOrganizerByOrganizerEvent',
                query.Var('contactId'),
                eventId
              )
            }
          )
        )
      )
    );
  }

  console.log(JSON.stringify(result.data));

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(
        ({ user, eventInvitation, isOrganizer }) => ({
          ...getPublicUserData(user),
          isConnected: true,
          canInvite:
            !isOrganizer &&
            (!eventInvitation || eventInvitation.rejectedAt)
        })
      ),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
