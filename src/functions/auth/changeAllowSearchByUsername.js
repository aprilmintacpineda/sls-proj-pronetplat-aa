const {
  initClient,
  updateById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const jwt = require('dependencies/utils/jwt');
const { getUserData } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

async function handler ({
  authUser,
  formBody: { allowSearchByUsername }
}) {
  const client = initClient();

  const user = await client.query(
    updateById('users', authUser.id, { allowSearchByUsername })
  );

  const userData = getUserData(user);
  const authToken = await jwt.sign(userData);

  return {
    statusCode: 200,
    body: JSON.stringify({
      userData,
      authToken
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  formValidator: ({ allowSearchByUsername }) =>
    validate(allowSearchByUsername, ['required', 'bool']),
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
