const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');

async function handler ({ authUser }) {
  // @TODO implement
  console.log(authUser);
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ]
});
