const name = 'contactRequests';

module.exports.up = q => {
  return q.If(q.Not(q.Exists(q.Collection(name))), q.CreateCollection({ name }), null);
};

module.exports.down = q => {
  const collection = q.Collection(name);
  return q.If(q.Exists(collection), q.Delete(collection), null);
};
