const name = 'contactByOwnerContact';

module.exports.up = q => {
  return q.If(
    q.Not(q.Exists(q.Index(name))),
    q.CreateIndex({
      name,
      source: q.Collection('contacts'),
      terms: [{ field: ['data', 'ownerId'] }, { field: ['data', 'contactId'] }],
      unique: true
    }),
    null
  );
};

module.exports.down = q => {
  const index = q.Index(name);
  return q.If(q.Exists(index), q.Delete(index), null);
};
