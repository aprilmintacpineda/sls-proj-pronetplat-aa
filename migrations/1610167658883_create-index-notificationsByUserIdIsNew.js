const name = 'notificationsByUserIdIsNew';

module.exports.up = q => {
  return q.CreateIndex({
    name,
    source: {
      collection: q.Collection('notifications'),
      fields: {
        isNew: q.Query(
          q.Lambda(
            ['document'],
            q.If(q.IsNull(q.Select(['data', 'seenAt'], q.Var('document'), null)), 1, 0)
          )
        )
      }
    },
    terms: [{ field: ['data', 'userId'] }, { binding: 'isNew' }]
  });
};

module.exports.down = q => {
  const index = q.Index(name);

  return q.If(q.Exists(index), q.Delete(index), null);
};
