const { query, Client } = require('faunadb');

async function main () {
  const client = new Client({
    secret: process.env.secret
  });

  await client.query(
    query.Map(
      query.Paginate(query.Collections()),
      query.Lambda(
        ['ref'],
        query.If(
          query.Equals(
            query.Select(['id'], query.Var('ref')),
            'Migration'
          ),
          null,
          query.Map(
            query.Paginate(query.Documents(query.Var('ref')), {
              size: 9999
            }),
            query.Lambda(['ref'], query.Delete(query.Var('ref')))
          )
        )
      )
    )
  );
}

main();
