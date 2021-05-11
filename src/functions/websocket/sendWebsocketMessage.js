async function handler (event) {
  console.log(JSON.stringify(event, null, 2));
  console.log('sendWebsocketMessage');
  return { statusCode: 200 };
}

module.exports.handler = handler;
