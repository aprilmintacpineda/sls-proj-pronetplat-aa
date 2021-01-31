const name = 'updateUserBadgeCount';

module.exports.up = q => {
  const badgesOperations = {
    notificationsCount: {
      notificationsCount: q.Max(
        0,
        q.Add(q.Var('notificationsCount'), q.Var('amount'))
      )
    },
    receivedContactRequestsCount: {
      receivedContactRequestsCount: q.Max(
        0,
        q.Add(q.Var('receivedContactRequestsCount'), q.Var('amount'))
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

  return q.If(
    q.Not(q.Exists(q.Function(name))),
    q.CreateFunction({
      name,
      body: q.Query(
        q.Lambda(
          ['userId', 'targetBadge', 'amount'],
          q.If(
            q.Not(
              q.ContainsValue(q.Var('targetBadge'), allowedBadges)
            ),
            q.Abort(invalidTargetBadgeErrorNMsg),
            q.Let(
              {
                ref: q.Ref(q.Collection('users'), q.Var('userId'))
              },
              q.If(
                q.Exists(q.Var('ref')),
                q.Let(
                  {
                    document: q.Get(q.Var('ref')),
                    notificationsCount: q.Select(
                      ['data', 'notificationsCount'],
                      q.Var('document'),
                      0
                    ),
                    receivedContactRequestsCount: q.Select(
                      ['data', 'receivedContactRequestsCount'],
                      q.Var('document'),
                      0
                    )
                  },
                  q.If(
                    q.Not(
                      q.ContainsPath(
                        ['data', 'closedAt'],
                        q.Var('document')
                      )
                    ),
                    q.Update(q.Var('ref'), {
                      data: q.Select(
                        q.Var('targetBadge'),
                        badgesOperations
                      )
                    }),
                    {
                      statusText: 'userAccountClosed'
                    }
                  )
                ),
                {
                  statusText: 'userDoesNotExist'
                }
              )
            )
          )
        )
      )
    }),
    null
  );
};

module.exports.down = q => {
  const func = q.Function(name);
  return q.If(q.Exists(func), q.Delete(func), null);
};
