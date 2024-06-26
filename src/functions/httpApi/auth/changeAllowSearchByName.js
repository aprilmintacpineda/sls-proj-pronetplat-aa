const {
  initClient,
  updateById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const jwt = require('dependencies/utils/jwt');
const { getUserData } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

async function handler ({
  authUser,
  formBody: { allowSearchByName }
}) {
  const faunadb = initClient();

  const user = await faunadb.query(
    updateById('users', authUser.id, { allowSearchByName })
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

module.exports = httpGuard({
  handler,
  formValidator: ({ allowSearchByName }) =>
    validate(allowSearchByName, ['required', 'bool']),
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
