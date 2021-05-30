async function handler (websocketEvent) {
  console.log(websocketEvent);

  return { statusCode: 200 };
}

module.exports.handler = handler;
