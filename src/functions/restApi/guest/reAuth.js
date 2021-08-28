const { query } = require('faunadb');
const {
  initClient,
  createOrUpdate,
  update,
  getByIndexIfExists
} = require('dependencies/utils/faunadb');
const { verifyHash } = require('dependencies/utils/helpers');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const jwt = require('dependencies/utils/jwt');
const { getUserData } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

async function handler ({ formBody, deviceToken, authUser }) {
  const faunadb = initClient();

  const user = await faunadb.query(
    getByIndexIfExists('userByEmail', authUser.email)
  );

  if (!user) {
    console.log('User does not exists');
    return { statusCode: 403 };
  }

  if (
    !(await verifyHash(formBody.password, user.data.hashedPassword))
  ) {
    console.log('Incorrect password');
    return { statusCode: 403 };
  }

  await faunadb.query(
    query.Do(
      createOrUpdate({
        index: 'registeredDeviceByUserIdDeviceToken',
        args: [user.ref.id, deviceToken],
        collection: 'registeredDevices',
        data: {
          userId: user.ref.id,
          deviceToken: deviceToken
        }
      }),
      update(user.ref, {
        lastLoginAt: query.Format('%t', query.Now())
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

module.exports = httpGuard({
  handler,
  guards: [
    guardTypes.softAuth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ],
  formValidator: ({ password }) => {
    return validate(password, ['required', 'maxLength:30']);
  }
});
