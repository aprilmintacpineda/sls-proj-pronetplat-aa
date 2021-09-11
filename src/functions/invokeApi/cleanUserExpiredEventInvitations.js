const { query } = require('faunadb');
const {
  initClient,
  update,
  getById
} = require('dependencies/utils/faunadb');

module.exports = async function handler ({ authUser }) {
  const faunadb = initClient();
  let nextToken = null;

  do {
    nextToken = await faunadb.query(
      query.Let(
        {
          result: query.Paginate(
            query.Union(
              query.Match(
                query.Index('eventInvitationsByUserStatus'),
                authUser.id,
                'pending'
              ),
              query.Match(
                query.Index('eventInvitationsByInviterStatus'),
                authUser.id,
                'pending'
              )
            ),
            {
              size: 1,
              after: nextToken || []
            }
          )
        },
        query.Do(
          query.Foreach(
            query.Var('result'),
            query.Lambda(
              ['eventId', 'userId', 'ref'],
              query.Let(
                {
                  event: getById('_events', query.Var('eventId'))
                },
                query.If(
                  query.GTE(
                    query.Now(),
                    query.Select(
                      ['data', 'startDateTime'],
                      query.Var('event')
                    )
                  ),
                  update(query.Var('ref'), {
                    status: 'expired'
                  }),
                  null
                )
              )
            )
          ),
          query.Select(['after'], query.Var('result'), false)
        )
      )
    );

    console.log(nextToken);
  } while (nextToken);
};
