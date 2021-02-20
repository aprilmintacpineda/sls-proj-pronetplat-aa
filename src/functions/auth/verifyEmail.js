const { query } = require('faunadb');
const User = require('dependencies/models/User');
const {
  verifyHash,
  hasTimePassed,
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const validate = require('dependencies/utils/validate');

function hasErrors ({ verificationCode }) {
  return validate(verificationCode, ['required', 'maxLength:20']);
}

module.exports.handler = async ({ headers, body }) => {
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) {
    console.log('Invalid form body');
    return { statusCode: 400 };
  }

  let authUser;

  try {
    const token = await jwt.verify(headerValues.authToken);
    authUser = token.data;
  } catch (_1) {
    console.log('Invalid token');
    return { statusCode: 401 };
  }

  if (authUser.emailVerifiedAt) {
    console.log('Email has already been verified');
    return { statusCode: 400 };
  }

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

  const user = new User();
  await user.updateById(authUser.id, {
    emailVerifiedAt: query.Format('%t', query.Now()),
    emailConfirmCodeExpiresAt: null,
    emailCodeCanSendAt: null,
    hashedEmailVerificationCode: null,
    notificationsCount: 0,
    receivedContactRequestsCount: 0,
    contactsCount: 0
  });

  const userData = user.toResponseData();
  const authToken = await jwt.sign(userData);

  return {
    statusCode: 200,
    body: JSON.stringify({
      userData,
      authToken
    })
  };
};
