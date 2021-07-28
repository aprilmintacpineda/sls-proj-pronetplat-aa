const { query } = require('faunadb');

function constructIncrementQuery (badgesOperation) {
  return {
    [badgesOperation]: query.Max(
      0,
      query.Add(
        query.Select(
          ['data', badgesOperation],
          query.Var('document'),
          0
        ),
        query.Var('amount')
      )
    ),
    updatedAt: query.Format('%t', query.Now())
  };
}

const badgesOperations = {
  notificationsCount: constructIncrementQuery('notificationsCount'),
  receivedContactRequestsCount: constructIncrementQuery(
    'receivedContactRequestsCount'
  ),
  contactsCount: constructIncrementQuery('contactsCount'),
  unreadChatMessagesCount: constructIncrementQuery(
    'unreadChatMessagesCount'
  ),
  eventInvitationsCount: constructIncrementQuery(
    'eventInvitationsCount'
  )
};

const allowedBadges = Object.keys(badgesOperations);

const invalidTargetBadgeErrorNMsg = query.Concat(
  [
    'Invalid argument `targetBadge`:',
    query.Concat(['`', query.Var('targetBadge'), '`'], ''),
    'provided,',
    query.Concat(
      ['expecting `', query.Concat(allowedBadges, '` | `'), '`'],
      ''
    )
  ],
  ' '
);

export default query.CreateFunction({
  name: 'updateUserBadgeCount',
  body: query.Query(
    query.Lambda(
      ['userId', 'targetBadge', 'amount'],
      query.If(
        query.Not(
          query.ContainsValue(
            query.Var('targetBadge'),
            allowedBadges
          )
        ),
        query.Abort(invalidTargetBadgeErrorNMsg),
        query.Let(
          {
            ref: query.Ref(
              query.Collection('users'),
              query.Var('userId')
            ),
            document: query.Get(query.Var('ref'))
          },
          query.If(
            query.Not(
              query.ContainsPath(
                ['data', 'closedAt'],
                query.Var('document')
              )
            ),
            query.Update(query.Var('ref'), {
              data: query.Select(
                query.Var('targetBadge'),
                badgesOperations
              )
            }),
            null
          )
        )
      )
    )
  )
});
