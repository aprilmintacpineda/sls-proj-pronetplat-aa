const name = 'contactRequestBySenderIdRecipientId';

module.exports.up = q => {
  return q.If(
    q.Not(q.Exists(q.Index(name))),
    q.CreateIndex({
      name,
      source: q.Collection('contactRequests'),
      terms: [
        { field: ['data', 'senderId'] },
        { field: ['data', 'recipientId'] }
      ],
      unique: true
    }),
    null
  );
};

module.exports.down = q => {
  const index = q.Index(name);
  return q.If(q.Exists(index), q.Delete(index), null);
};
