const name = 'userRefSortedByFullName';

module.exports.up = q => {
  return q.If(
    q.Not(q.Exists(q.Index(name))),
    q.CreateIndex({
      name,
      source: q.Collection('users'),
      terms: [{ field: ['ref'] }],
      values: [
        { field: ['data', 'firstName'] },
        { field: ['data', 'middleName'] },
        { field: ['data', 'lastName'] },
        { field: ['ref'] }
      ]
    }),
    null
  );
};

module.exports.down = q => {
  const index = q.Index(name);
  return q.If(q.Exists(index), q.Delete(index), null);
};