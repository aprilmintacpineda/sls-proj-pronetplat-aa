const { query, Client } = require('faunadb');

async function main () {
  const client = new Client({
    secret: 'fnAD9q43t4ACDb-_cBDCkcUxWHj303eieg8caCWg'
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
