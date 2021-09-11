const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');

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
              size: 2,
              after: nextToken
                ? [
                    nextToken[0],
                    nextToken[1],
                    query.Ref(
                      query.Collection('eventInvitations'),
                      nextToken[2]
                    )
                  ]
                : []
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
                  event: query.Get(
                    query.Ref(
                      query.Collection('_events'),
                      query.Var('eventId')
                    )
                  )
                },
                query.If(
                  query.GTE(
                    query.Now(),
                    query.Select(
                      ['data', 'startDateTime'],
                      query.Var('event')
                    )
                  ),
                  query.Update(query.Var('ref'), {
                    data: {
                      status: 'expired'
                    }
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
