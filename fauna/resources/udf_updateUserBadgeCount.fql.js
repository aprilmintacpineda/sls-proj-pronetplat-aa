const { query } = require('faunadb');

const badgesOperations = {
  notificationsCount: {
    notificationsCount: query.Max(
      0,
      query.Add(
        query.Select(
          ['data', 'notificationsCount'],
          query.Var('document'),
          0
        ),
        query.Var('amount')
      )
    )
  },
  receivedContactRequestsCount: {
    receivedContactRequestsCount: query.Max(
      0,
      query.Add(
        query.Select(
          ['data', 'receivedContactRequestsCount'],
          query.Var('document'),
          0
        ),
        query.Var('amount')
      )
    )
  },
  contactsCount: {
    contactsCount: query.Max(
      0,
      query.Add(
        query.Select(
          ['data', 'contactsCount'],
          query.Var('document'),
          0
        ),
        query.Var('amount')
      )
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
