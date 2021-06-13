const { query } = require('faunadb');

const badgesOperations = {
  unreadChatMessagesFromContact: {
    unreadChatMessagesFromContact: query.Max(
      0,
      query.Add(
        query.Select(
          ['data', 'unreadChatMessagesFromContact'],
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

const index = query.Match(
  query.Index('contactByOwnerContact'),
  query.Var('userId'),
  query.Var('contactId')
);

export default query.CreateFunction({
  name: 'updateContactBadgeCount',
  body: query.Query(
    query.Lambda(
      ['userId', 'contactId', 'targetBadge', 'amount'],
      query.If(
        query.Not(
          query.ContainsValue(
            query.Var('targetBadge'),
            allowedBadges
          )
        ),
        query.Abort(invalidTargetBadgeErrorNMsg),
        query.If(
          query.Exists(index),
          query.Let(
            {
              document: query.Get(index)
            },
            query.Update(
              query.Select(['ref'], query.Var('document')),
              {
                data: query.Select(
                  query.Var('targetBadge'),
                  badgesOperations
                )
              }
            )
          ),
          null
        )
      )
    )
  )
});
