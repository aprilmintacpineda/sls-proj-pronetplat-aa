const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ params: { search } }) {
  if (!search) {
    return {
      statusCode: 200,
      body: JSON.stringify({ data: [] })
    };
  }

  let results = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${search}&key=` +
      '__googleApiKey__'
  );

  results = await results.json();

  if (results.status !== 'OK') return { statusCode: 500 };

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: results.predictions
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
