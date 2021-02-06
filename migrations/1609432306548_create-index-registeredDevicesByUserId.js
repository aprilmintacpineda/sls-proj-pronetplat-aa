const name = 'registeredDevicesByUserId';

module.exports.up = q => {
  return q.If(
    q.Not(q.Exists(q.Index(name))),
    q.CreateIndex({
      name,
      source: q.Collection('registeredDevices'),
      terms: [{ field: ['data', 'userId'] }],
      values: [
        { field: ['data', 'expiresAt'] },
        { field: ['data', 'deviceToken'] },
        { field: ['data', 'userId'] },
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
