const name = 'contactRequestByUserFromTo';

module.exports.up = q => {
  return q.CreateIndex({
    name,
    source: q.Collection('contactRequests'),
    terms: [{ field: ['data', 'senderId'] }, { field: ['data', 'recipientId'] }],
    unique: true
  });
};

module.exports.down = q => {
  const index = q.Index(name);

  return q.If(q.Exists(index), q.Delete(index), null);
};
