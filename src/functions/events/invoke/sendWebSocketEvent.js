const AWS = require('aws-sdk');
const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const { getPublicUserData } = require('dependencies/utils/users');

module.exports.handler = async ({
  authUser,
  userId,
  event,
  payload
}) => {
  const faunadb = initClient();
  let after = null;
  let connectionIds = [];

  do {
    const result = await faunadb.query(
      query.Paginate(
        query.Match(
          query.Index('userWebSocketConnectionsByUserId'),
          userId
        ),
        {
          size: 20,
          after: after || []
        }
      )
    );

    connectionIds = connectionIds.concat(result.data);
    after = result.after;
  } while (after);

  const apiGateway = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint:
      '9ij2l2b278.execute-api.ap-southeast-1.amazonaws.com/dev'
  });

  await Promise.all(
    connectionIds.map(([connectionId]) =>
      apiGateway
        .postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            user: getPublicUserData({
              ref: { id: authUser.id },
              data: authUser
            }),
            event,
            payload
          })
        })
        .promise()
    )
  );
};
