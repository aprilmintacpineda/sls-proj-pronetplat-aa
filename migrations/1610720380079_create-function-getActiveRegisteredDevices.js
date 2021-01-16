const name = 'getActiveRegisteredDevices';

module.exports.up = q => {
  return q.If(
    q.Not(q.Exists(q.Function(name))),
    q.CreateFunction({
      name,
      body: q.Query(
        q.Lambda(
          ['userId', 'nextToken'],
          q.Filter(
            q.Map(
              q.Paginate(
                q.Match(
                  q.Index('registeredDevicesByUserId'),
                  q.Var('userId')
                ),
                {
                  size: 20,
                  after: q.If(
                    q.Equals(q.Var('nextToken'), ''),
                    [],
                    q.Var('nextToken')
                  )
                }
              ),
              q.Lambda(['ref'], q.Get(q.Var('ref')))
            ),
            q.Lambda(
              ['document'],
              q.LT(
                q.Now(),
                q.Time(
                  q.Select(['data', 'expiresAt'], q.Var('document'))
                )
              )
            )
          )
        )
      )
    }),
    null
  );
};

module.exports.down = q => {
  const func = q.Function(name);
  return q.If(q.Exists(func), q.Delete(func), null);
};
