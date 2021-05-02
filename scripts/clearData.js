const { query, Client } = require('faunadb');

async function main () {
  const client = new Client({
    secret: process.env.secret
  });

  await client.query(
    query.Paginate(
      query.Map(
        query.Collections(),
        query.Lambda(
          ['ref'],
          query.If(
            query.Equals(
              query.Select(['id'], query.Var('ref')),
              'Migration'
            ),
            null,
            query.Paginate(
              query.Map(
                query.Documents(query.Var('ref')),
                query.Lambda(['ref'], query.Delete(query.Var('ref')))
              ),
              {
                size: 9999
              }
            )
          )
        )
      )
    )
  );
}

main();
