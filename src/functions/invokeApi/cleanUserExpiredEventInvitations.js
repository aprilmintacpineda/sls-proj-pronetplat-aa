// const { initClient } = require("dependencies/utils/faunadb");

async function handler ({ authUser }) {
  console.log(authUser);

  // const faunadb = initClient();
  // let nextToken = null;
}

module.exports.handler = handler;
