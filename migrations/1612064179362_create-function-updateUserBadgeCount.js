const name = 'updateUserBadgeCount';

module.exports.up = q => {
  const allowedBadges = [
    'notificationsCount',
    'contactRequestsCount'
  ];

  const allowedActions = ['increment', 'decrement'];

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

  const invalidActionErrorMsg = q.Concat(
    [
      'Invalid argument `action`:',
      q.Concat(['`', q.Var('action'), '`'], ''),
      'provided,',
      q.Concat(
        ['expecting `', q.Concat(allowedActions, '` | `'), '`'],
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
          ['userId', 'targetBadge', 'action'],
          q.If(
            q.Not(
              q.ContainsValue(q.Var('targetBadge'), allowedBadges)
            ),
            q.Abort(invalidTargetBadgeErrorNMsg),
            q.If(
              q.Not(
                q.ContainsValue(q.Var('action'), allowedActions)
              ),
              q.Abort(invalidActionErrorMsg),
              q.Let(
                {
                  ref: q.Ref(q.Collection('users'), q.Var('userId'))
                },
                q.If(
                  q.Exists(q.Var('ref')),
                  q.Let(
                    {
                      document: q.Get(q.Var('ref')),
                      notificationsCount: q.Max(
                        0,
                        q.Select(
                          ['data', 'notificationsCount'],
                          q.Var('document'),
                          0
                        )
                      ),
                      contactRequestsCount: q.Max(
                        0,
                        q.Select(
                          ['data', 'contactRequestsCount'],
                          q.Var('document'),
                          0
                        )
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
                        data: q.If(
                          q.And(
                            q.Equals(
                              q.Var('targetBadge'),
                              'notificationsCount'
                            ),
                            q.Equals(q.Var('action'), 'increment')
                          ),
                          {
                            notificationsCount: q.Add(
                              q.Var('notificationsCount'),
                              1
                            )
                          },
                          q.If(
                            q.And(
                              q.Equals(
                                q.Var('targetBadge'),
                                'notificationsCount'
                              ),
                              q.Equals(q.Var('action'), 'decrement')
                            ),
                            {
                              notificationsCount: q.Max(
                                0,
                                q.Subtract(
                                  q.Var('notificationsCount'),
                                  1
                                )
                              )
                            },
                            q.If(
                              q.And(
                                q.Equals(
                                  q.Var('targetBadge'),
                                  'contactRequestsCount'
                                ),
                                q.Equals(
                                  q.Var('action'),
                                  'increment'
                                )
                              ),
                              {
                                contactRequestsCount: q.Add(
                                  q.Var('contactRequestsCount'),
                                  1
                                )
                              },
                              {
                                contactRequestsCount: q.Max(
                                  0,
                                  q.Subtract(
                                    q.Var('contactRequestsCount'),
                                    1
                                  )
                                )
                              }
                            )
                          )
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
      )
    }),
    null
  );
};

module.exports.down = q => {
  const func = q.Function(name);
  return q.If(q.Exists(func), q.Delete(func), null);
};
