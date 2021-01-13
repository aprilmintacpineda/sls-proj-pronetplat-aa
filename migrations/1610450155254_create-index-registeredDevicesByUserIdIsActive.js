const name = 'registeredDevicesByUserIdIsActive';

module.exports.up = q => {
  return q.If(
    q.Not(q.Exists(q.Index(name))),
    q.CreateIndex({
      name,
      source: {
        collection: q.Collection('registeredDevices'),
        fields: {
          isActive: q.Query(
            q.Lambda(
              ['document'],
              q.If(
                q.LT(q.Time('now'), q.Select(['data', 'expiresAt'], q.Var('document'))),
                1,
                0
              )
            )
          )
        }
      },
      terms: [{ field: ['data', 'userId'] }, { binding: 'isActive' }]
    }),
    null
  );
};

module.exports.down = q => {
  const index = q.Index(name);
  return q.If(q.Exists(index), q.Delete(index), null);
};
