const jwt = require('./jwt');

const guardTypes = {
  deviceToken: 'deviceToken',
  auth: 'auth',
  emailVerified: 'emailVerified',
  setupComplete: 'setupComplete'
};

module.exports.httpGuard = ({
  handler,
  guards,
  formValidator = null
}) => async httpEvent => {
  const queryStringParameters =
    httpEvent.queryStringParameters || {};

  const results = {
    body: httpEvent.body,
    queryStringParameters,
    pathParameters: httpEvent.pathParameters || {},
    headers: httpEvent.headers,
    nextToken: queryStringParameters.nextToken || null
  };

  if (guards.includes(guardTypes.deviceToken)) {
    const deviceToken = httpEvent.headers['device-token'];

    if (!deviceToken) {
      console.log('Guard: no device-token in headers');
      return { statusCode: 400 };
    }

    results.deviceToken = deviceToken;
  }

  if (formValidator) {
    const formBody = JSON.parse(httpEvent.body);
    if (formValidator(formBody)) {
      console.log('invalid form body');
      return { statusCode: 400 };
    }

    results.formBody = formBody;
  }

  if (guards.includes(guardTypes.auth)) {
    const authorization =
      httpEvent.headers.Authorization ||
      httpEvent.headers.authorization;

    if (!authorization) {
      console.log('Guard: no authorization in headers');
      return { statusCode: 401 };
    }

    try {
      const { data: authUser } = await jwt.verify(
        authorization.replace(/Bearer /gim, '').trim()
      );

      if (guards.includes(guardTypes.setupComplete)) {
        if (
          !authUser.firstName ||
          !authUser.surname ||
          !authUser.gender ||
          !authUser.jobTitle ||
          !authUser.profilePicture ||
          !authUser.emailVerifiedAt
        ) {
          console.log('Guard: Not yet setup');
          return { statusCode: 403 };
        }
      } else if (guards.includes(guardTypes.emailVerified)) {
        if (!authUser.emailVerifiedAt) {
          console.log('Guard: email not verified');
          return { statusCode: 403 };
        }
      }

      results.authUser = authUser;
    } catch (error) {
      console.log('Guard: token error', error);
      return { statusCode: 401 };
    }
  }

  return handler(results, httpEvent);
};

module.exports.guardTypes = guardTypes;
