require('cross-fetch/polyfill');

const routes = require('./routes');

async function handler (httpEvent) {
  console.log(httpEvent);

  const { httpMethod, path } = httpEvent;
  const routeHandler = routes.getRouteHandler(httpMethod, path);
  if (!routeHandler) return { statusCode: 404 };

  return routeHandler.callback({
    ...httpEvent,
    pathParameters: routeHandler.pathParameters || {},
    queryStringParameters: httpEvent.queryStringParameters || {}
  });
}

module.exports.handler = handler;
