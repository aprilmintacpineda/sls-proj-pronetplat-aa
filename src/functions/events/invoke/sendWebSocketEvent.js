const AWS = require('aws-sdk');
const { query } = require('faunadb');
const {
  initClient,
  hardDeleteByIndex
} = require('dependencies/utils/faunadb');
const { getPublicUserData } = require('dependencies/utils/users');

const apiGateway = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: '86iml7zhuc.execute-api.ap-southeast-1.amazonaws.com/dev'
});

module.exports.handler = async ({
  authUser,
  userId,
  type,
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

  await Promise.all(
    connectionIds.map(async ([connectionId]) => {
      try {
        await apiGateway
          .postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({
              user: getPublicUserData({
                ref: { id: authUser.id },
                data: authUser
              }),
              type,
              payload
            })
          })
          .promise();
      } catch (error) {
        console.log(error);

        if (error.statusCode === 410) {
          await faunadb.query(
            hardDeleteByIndex(
              'userWebSocketConnectionByConnectionId',
              connectionId
            )
          );
        }
      }
    })
  );
};
