const { isValidDeviceToken } = require('./firebase');
const jwt = require('./jwt');
const {
  hasCompletedSetup,
  hasCompletePersonalInfo
} = require('./users');

const guardTypes = {
  deviceToken: 'deviceToken',
  auth: 'auth',
  softAuth: 'softAuth',
  emailVerified: 'emailVerified',
  emailNotVerified: 'emailNotVerified',
  setupComplete: 'setupComplete',
  setupNotComplete: 'setupNotComplete',
  personalInfoComplete: 'personalInfoComplete'
};

function resolveParams (httpEvent) {
  const params = {};

  if (httpEvent.pathParameters) {
    Object.keys(httpEvent.pathParameters).forEach(key => {
      params[key] = decodeURIComponent(
        httpEvent.pathParameters[key]
      );
    });
  }

  if (httpEvent.queryStringParameters) {
    Object.keys(httpEvent.queryStringParameters).forEach(key => {
      params[key] = decodeURIComponent(
        httpEvent.queryStringParameters[key]
      );
    });
  }

  return params;
}

function httpGuard ({
  handler,
  guards = [],
  formValidator = null,
  queryParamsValidator
}) {
  return async httpEvent => {
    if (
      queryParamsValidator &&
      queryParamsValidator(httpEvent.queryStringParameters)
    )
      return { statusCode: 400 };

    const payload = {
      params: resolveParams(httpEvent),
      sourceIp: httpEvent.headers['X-Forwarded-For']
        .split(',')[0]
        .trim()
    };

    if (guards.includes(guardTypes.deviceToken)) {
      const deviceToken = httpEvent.headers['device-token'];

      if (!deviceToken) {
        console.log('Guard: no device-token in headers');
        return { statusCode: 400 };
      }

      if (!(await isValidDeviceToken(deviceToken))) {
        console.log('Guard: invalid device-token in headers');
        return { statusCode: 400 };
      }

      payload.deviceToken = deviceToken;
    }

    if (formValidator) {
      const formBody = JSON.parse(httpEvent.body) || {};

      if (formValidator(formBody)) {
        console.log('invalid form body');
        return { statusCode: 400 };
      }

      payload.formBody = formBody;
    }

    if (
      guards.includes(guardTypes.auth) ||
      guards.includes(guardTypes.softAuth)
    ) {
      const authorization = (httpEvent.headers.Authorization || '')
        .replace(/Bearer /gim, '')
        .trim();

      if (!authorization) {
        console.log('Guard: auth failed');
        return { statusCode: 401 };
      }

      try {
        const verifiedJwt = await jwt.verify(
          authorization,
          guards.includes(guardTypes.softAuth)
        );

        const authUser = verifiedJwt.data;

        if (
          guards.includes(guardTypes.setupComplete) &&
          !hasCompletedSetup(authUser)
        ) {
          console.log('Guard: setupComplete failed');
          return { statusCode: 400 };
        } else if (
          guards.includes(guardTypes.personalInfoComplete) &&
          !hasCompletePersonalInfo(authUser)
        ) {
          console.log('Guard: personalInfoComplete failed');
          return { statusCode: 400 };
        } else if (
          guards.includes(guardTypes.setupNotComplete) &&
          (!authUser.emailVerifiedAt ||
            authUser.profilePicture ||
            !authUser.firstName ||
            !authUser.surname ||
            !authUser.gender ||
            !authUser.jobTitle)
        ) {
          console.log('Guard: setupNotComplete failed');
          return { statusCode: 400 };
        } else if (
          guards.includes(guardTypes.emailVerified) &&
          !authUser.emailVerifiedAt
        ) {
          console.log('Guard: emailVerified');
          return { statusCode: 400 };
        } else if (
          guards.includes(guardTypes.emailNotVerified) &&
          authUser.emailVerifiedAt
        ) {
          console.log('Guard: emailNotVerified failed');
          return { statusCode: 400 };
        }

        payload.authUser = authUser;
        payload.verifiedJwt = verifiedJwt;
      } catch (error) {
        console.log('Guard: token error', error);
        return { statusCode: 401 };
      }
    }

    return handler(payload, httpEvent);
  };
}

module.exports.httpGuard = httpGuard;
module.exports.guardTypes = guardTypes;
