const { query } = require('faunadb');
const {
  initClient,
  updateById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const {
  verifyHash,
  hasTimePassed
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const { getUserData } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  if (hasTimePassed(authUser.emailConfirmCodeExpiresAt)) {
    console.log('emailConfirmCode expired');
    return { statusCode: 410 };
  }

  if (
    !(await verifyHash(
      formBody.verificationCode,
      authUser.hashedEmailVerificationCode
    ))
  ) {
    console.log('Incorrect verification code');
    return { statusCode: 403 };
  }

  const faunadb = initClient();
  const user = await faunadb.query(
    updateById('users', authUser.id, {
      emailVerifiedAt: query.Format('%t', query.Now()),
      emailConfirmCodeExpiresAt: null,
      emailCodeCanSendAt: null,
      hashedEmailVerificationCode: null,
      notificationsCount: 0,
      receivedContactRequestsCount: 0,
      contactsCount: 0
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

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.emailVerified
  ],
  formValidator: ({ verificationCode }) => {
    return validate(verificationCode, ['required', 'maxLength:20']);
  }
});
