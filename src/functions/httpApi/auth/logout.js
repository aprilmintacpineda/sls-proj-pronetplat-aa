const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { invokeEvent } = require('dependencies/utils/lambda');

async function handler ({ deviceToken, authUser }) {
  await invokeEvent({
    eventName: 'forceExpireDeviceToken',
    payload: {
      deviceToken,
      userId: authUser.id
    }
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ]
});
