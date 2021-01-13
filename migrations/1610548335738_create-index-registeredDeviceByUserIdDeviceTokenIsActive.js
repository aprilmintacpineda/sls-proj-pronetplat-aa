const name = 'registeredDeviceByUserIdDeviceTokenIsActive';

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
                q.LT(q.Now(), q.Select(['data', 'expiresAt'], q.Var('document'))),
                1,
                0
              )
            )
          )
        }
      },
      terms: [
        { field: ['data', 'userId'] },
        { field: ['data', 'deviceToken'] },
        { binding: 'isActive' }
      ]
    }),
    null
  );
};

module.exports.down = q => {
  return q.Delete(q.Collection('Users'));
};
