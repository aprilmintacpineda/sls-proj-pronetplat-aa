async function handler (event) {
  console.log(JSON.stringify(event));
}

module.exports.handler = handler;
