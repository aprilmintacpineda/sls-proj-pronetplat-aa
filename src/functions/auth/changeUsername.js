const {
  initClient,
  updateById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const fauna = initClient();

  try {
    await fauna.query(
      updateById('users', authUser.id, {
        username: formBody.username || null
      })
    );
  } catch (error) {
    console.log(error);
    return { statusCode: 409 };
  }

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  formValidator: ({ username }) => {
    return validate(username, ['alphanumeric', 'maxLength:18']);
  },
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
