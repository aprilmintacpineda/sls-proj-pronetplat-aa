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

async function handler ({ authUser, formBody }) {
  const faunadb = initClient();

  try {
    const user = await faunadb.query(
      updateById('users', authUser.id, {
        username: formBody.username || null
      })
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
  } catch (error) {
    console.log(error);
    return { statusCode: 409 };
  }
}

module.exports = httpGuard({
  handler,
  formValidator: ({ username }) => {
    return validate(username, ['alphanumeric', 'maxLength:18']);
  },
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
