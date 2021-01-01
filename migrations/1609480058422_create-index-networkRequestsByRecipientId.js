const name = 'networkRequestsByRecipientId';

module.exports.up = q => {
  return q.CreateIndex({
    name,
    source: q.Collection('networkRequests'),
    terms: [
      {
        field: ['data', 'recipientId']
      }
    ]
  });
};

module.exports.down = q => {
  const index = q.Index(name);

  return q.If(q.Exists(index), q.Delete(index), null);
};
