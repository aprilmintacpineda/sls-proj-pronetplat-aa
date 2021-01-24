const name = 'userBlockingsByBlockerIdUserId';

module.exports.up = q => {
  return q.If(
    q.Not(q.Exists(q.Index(name))),
    q.CreateIndex({
      name,
      source: q.Collection('userBlockings'),
      terms: [
        { field: ['data', 'blockerId'] },
        { field: ['data', 'userId'] }
      ]
    }),
    null
  );
};

module.exports.down = q => {
  const index = q.Index('Users');
  return q.If(q.Exists(index), q.Delete(index), null);
};
