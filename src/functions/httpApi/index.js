async function handler (httpEvent) {
  console.log(httpEvent);
  return { statusCode: 200 };
}

module.exports.handler = handler;
