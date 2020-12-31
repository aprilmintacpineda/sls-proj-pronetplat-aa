const name = 'contacts';

module.exports.up = q => {
  return q.CreateCollection({ name });
};

module.exports.down = q => {
  const collection = q.Collection(name);

  return q.If(q.Exists(collection), q.Delete(collection), null);
};
