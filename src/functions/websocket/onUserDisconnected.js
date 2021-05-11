async function handler (event) {
  console.log('onUserDisconnected');
  console.log(JSON.stringify(event, null, 2));
  return { statusCode: 200 };
}

module.exports.handler = handler;
