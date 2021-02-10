const UserBlocking = require('dependencies/nodejs/models/UserBlocking');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ body, headers }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    throwIfNotCompletedSetup(authUser);

    const userBlocking = new UserBlocking();

    await userBlocking.hardDeleteIfExists(
      'userBlockingsByBlockerIdUserId',
      authUser.id,
      formBody.contactId
    );

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
