async function handler (events) {
  console.log(JSON.stringify(events, null, 2));
  console.log('onUserDisconnected');
}

module.exports.handler = handler;
