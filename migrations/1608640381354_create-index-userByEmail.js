const name ='userByEmail';

module.exports.up = q => {
  return q.CreateIndex({
    name,
    source: q.Collection('users'),
    terms: [
      {
        field: ['data', 'email']
      }
    ],
    unique: true
  });
};

module.exports.down = q => {
  const index = q.Index(name);

  return q.If(
    q.Exists(index),
    q.Delete(index),
    null
  );
};