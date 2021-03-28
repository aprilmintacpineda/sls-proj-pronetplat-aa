const { query: q } = require('faunadb');

const badgesOperations = {
  notificationsCount: {
    notificationsCount: q.Max(
      0,
      q.Add(
        q.Select(
          ['data', 'notificationsCount'],
          q.Var('document'),
          0
        ),
        q.Var('amount')
      )
    )
  },
  receivedContactRequestsCount: {
    receivedContactRequestsCount: q.Max(
      0,
      q.Add(
        q.Select(
          ['data', 'receivedContactRequestsCount'],
          q.Var('document'),
          0
        ),
        q.Var('amount')
      )
    )
  },
  contactsCount: {
    contactsCount: q.Max(
      0,
      q.Add(
        q.Select(['data', 'contactsCount'], q.Var('document'), 0),
        q.Var('amount')
      )
    )
  }
};

const allowedBadges = Object.keys(badgesOperations);

const invalidTargetBadgeErrorNMsg = q.Concat(
  [
    'Invalid argument `targetBadge`:',
    q.Concat(['`', q.Var('targetBadge'), '`'], ''),
    'provided,',
    q.Concat(
      ['expecting `', q.Concat(allowedBadges, '` | `'), '`'],
      ''
    )
  ],
  ' '
);

export default q.CreateFunction({
  name: 'updateUserBadgeCount',
  body: q.Query(
    q.Lambda(
      ['userId', 'targetBadge', 'amount'],
      q.If(
        q.Not(q.ContainsValue(q.Var('targetBadge'), allowedBadges)),
        q.Abort(invalidTargetBadgeErrorNMsg),
        q.Let(
          {
            ref: q.Ref(q.Collection('users'), q.Var('userId')),
            document: q.Get(q.Var('ref'))
          },
          q.If(
            q.Not(
              q.ContainsPath(['data', 'closedAt'], q.Var('document'))
            ),
            q.Update(q.Var('ref'), {
              data: q.Select(q.Var('targetBadge'), badgesOperations)
            }),
            null
          )
        )
      )
    )
  )
});
