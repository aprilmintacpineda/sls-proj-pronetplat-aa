const name = 'contactByOwnerContact';

module.exports.up = q => {
  return q.CreateIndex({
    name,
    source: q.Collection('contacts'),
    terms: [{ field: ['data', 'ownerId'] }, { field: ['data', 'contactId'] }],
    unique: true
  });
};

module.exports.down = q => {
  const index = q.Index(name);
  return q.If(q.Exists(index), q.Delete(index), null);
};
