const name = 'notificationsByUserId';

module.exports.up = q => {
  return q.If(
    q.Not(q.Exists(q.Index(name))),
    q.CreateIndex({
      name,
      source: q.Collection('notifications'),
      terms: [{ field: ['data', 'userId'] }],
      values: [
        { field: ['ref'] },
        { field: ['data', 'actorId'] },
        { field: ['data', 'createdAt'], reverse: true }
      ]
    }),
    null
  );
};

module.exports.down = q => {
  const index = q.Index(name);
  return q.If(q.Exists(index), q.Delete(index), null);
};
