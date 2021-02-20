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
  try {
    const { authToken } = checkRequiredHeaderValues(headers);

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

    const { data: authUser } = await jwt.verify(authToken);

    if (authUser.emailVerifiedAt)
      throw new Error('Email has already been verified');

    if (hasTimePassed(authUser.emailConfirmCodeExpiresAt))
      return { statusCode: 410 };

    if (
      !(await verifyHash(
        formBody.verificationCode,
        authUser.hashedEmailVerificationCode
      ))
    )
      throw new Error('Incorrect verification code');

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
    const newAuthToken = await jwt.sign(userData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        userData,
        authToken: newAuthToken
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
