const { query } = require('faunadb');
const {
  initClient,
  createOrUpdate,
  update,
  getByIndexIfNotExists
} = require('dependencies/utils/faunadb');
const {
  isValidDeviceToken
} = require('dependencies/utils/firebase');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { verifyHash } = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const { getUserData } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

async function handler ({ formBody, deviceToken }) {
  const faunadb = initClient();

  const user = await faunadb.query(
    getByIndexIfNotExists('userByEmail', formBody.email)
  );

  if (
    !user ||
    !(await verifyHash(
      formBody.password,
      user.data.hashedPassword
    )) ||
    !(await isValidDeviceToken(deviceToken))
  )
    return { statusCode: 401 };

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
