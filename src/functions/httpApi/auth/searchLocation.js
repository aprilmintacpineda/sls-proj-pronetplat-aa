const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ params: { search } }) {
  if (!search) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: []
      })
    };
  }

  console.log(
    JSON.stringify(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${search}&key=__googleApiKey__`
    )
  );

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${search}&key=__googleApiKey__`
  );

  const results = await response.json();

  console.log(JSON.stringify(results, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: results
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
