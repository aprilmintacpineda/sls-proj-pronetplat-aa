const name = 'registeredDevicesByUserId';

module.exports.up = q => {
  return q.CreateIndex({
    name,
    source: q.Collection('registeredDevices'),
    terms: [
      {
        field: ['data', 'userId']
      }
    ]
  });
};

module.exports.down = q => {
  const index = q.Index(name);

  return q.If(q.Exists(index), q.Delete(index), null);
};
