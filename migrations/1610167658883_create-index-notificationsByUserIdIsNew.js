const name = 'notificationsByUserIdIsNew';

module.exports.up = q => {
  return q.If(
    q.Not(q.Exists(q.Index(name))),
    q.CreateIndex({
      name,
      source: {
        collection: q.Collection('notifications'),
        fields: {
          isNew: q.Query(
            q.Lambda(
              ['document'],
              q.If(
                q.ContainsPath(
                  ['data', 'seenAt'],
                  q.Var('document')
                ),
                0,
                1
              )
            )
          )
        }
      },
      terms: [{ field: ['data', 'userId'] }, { binding: 'isNew' }]
    }),
    null
  );
};

module.exports.down = q => {
  const index = q.Index(name);
  return q.If(q.Exists(index), q.Delete(index), null);
};
