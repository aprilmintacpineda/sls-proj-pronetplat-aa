const { query } = require('faunadb');
const {
  initClient,
  getById,
  update
} = require('dependencies/utils/faunadb');
const {
  verifyHash,
  hasTimePassed
} = require('dependencies/utils/helpers');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const jwt = require('dependencies/utils/jwt');
const { getUserData } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  if (hasTimePassed(authUser.emailConfirmCodeExpiresAt)) {
    console.log('emailConfirmCode expired');
    return { statusCode: 410 };
  }

  const faunadb = initClient();
  let user = await faunadb.query(getById('users', authUser.id));

  if (
    !(await verifyHash(
      formBody.verificationCode,
      user.data.hashedEmailVerificationCode
    ))
  ) {
    console.log('Incorrect verification code');
    return { statusCode: 403 };
  }

  user = await faunadb.query(
    update(user.ref, {
      emailVerifiedAt: query.Format('%t', query.Now()),
      emailConfirmCodeExpiresAt: null,
      emailCodeCanSendAt: null,
      hashedEmailVerificationCode: null,
      notificationsCount: 0,
      receivedContactRequestsCount: 0,
      contactsCount: 0,
      isTestAccount: false,
      allowSearchByName: false,
      allowSearchByUsername: false,
      unreadChatMessagesCount: 0
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
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.emailNotVerified],
  formValidator: ({ verificationCode }) => {
    return validate(verificationCode, ['required', 'maxLength:20']);
  }
});
