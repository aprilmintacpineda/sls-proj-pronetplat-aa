async function handler (event) {
  console.log('onUserConnected');
  console.log(JSON.stringify(event, null, 2));
  return { statusCode: 200 };
}

module.exports.handler = handler;
