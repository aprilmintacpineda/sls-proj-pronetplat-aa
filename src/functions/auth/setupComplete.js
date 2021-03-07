const { query } = require('faunadb');
const {
  initClient,
  createOrUpdate,
  updateById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const jwt = require('dependencies/utils/jwt');
const { getUserData } = require('dependencies/utils/users');

async function handler ({ authUser, deviceToken }) {
  const faunadb = initClient();

  const user = await faunadb.query(
    query.Do(
      createOrUpdate({
        collection: 'registeredDevices',
        index: 'registeredDeviceByUserIdDeviceToken',
        args: [authUser.id, deviceToken],
        data: {
          userId: authUser.id,
          deviceToken,
          expiresAt: query.Format(
            '%t',
            query.TimeAdd(query.Now(), 7, 'days')
          )
        }
      }),
      updateById('users', authUser.id, {
        lastLoginAt: query.Format(
          '%t',
          query.TimeAdd(query.Now(), 7, 'days')
        )
      })
    )
  );

  const userData = getUserData(user);
  const authToken = await jwt.sign(userData);

  return {
    statusCode: 200,
    body: JSON.stringify({
      authToken,
      userData
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupNotComplete
  ]
});
