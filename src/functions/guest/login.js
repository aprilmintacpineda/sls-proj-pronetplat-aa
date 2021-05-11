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

async function handler ({ formBody, deviceToken }) {
  const faunadb = initClient();

  const user = await faunadb.query(
    getByIndexIfExists('userByEmail', formBody.email)
  );

  if (!user) {
    console.log('User does not exists');
    return { statusCode: 403 };
  }

  if (
    !(await verifyHash(formBody.password, user.data.hashedPassword))
  ) {
    console.log('user password is incorrect');
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
          deviceToken: deviceToken,
          expiresAt: query.Format(
            '%t',
            query.TimeAdd(query.Now(), 7, 'days')
          )
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

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.deviceToken],
  formValidator: ({ email, password }) => {
    return (
      validate(email, ['required', 'email']) ||
      validate(password, ['required', 'maxLength:30'])
    );
  }
});
