const { query } = require('faunadb');

function constructIncrementQuery (badgesOperation) {
  return query.Max(
    0,
    query.Add(
      query.Select(
        ['data', badgesOperation],
        query.Var('document'),
        0
      ),
      query.Var('amount')
    )
  );
}

const badgesOperations = {
  notificationsCount: {
    notificationsCount: constructIncrementQuery('notificationsCount')
  },
  receivedContactRequestsCount: {
    receivedContactRequestsCount: constructIncrementQuery(
      'receivedContactRequestsCount'
    )
  },
  contactsCount: {
    contactsCount: constructIncrementQuery('contactsCount')
  },
  unreadChatMessagesCount: {
    unreadChatMessagesCount: constructIncrementQuery(
      'unreadChatMessagesCount'
    )
  }
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
