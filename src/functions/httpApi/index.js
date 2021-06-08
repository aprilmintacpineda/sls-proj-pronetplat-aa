const routes = require('./routes');

async function handler (httpEvent) {
  const { httpMethod, path } = httpEvent;
  const routeHandler = routes.getRouteHandler(httpMethod, path);
  if (!routeHandler) return { statusCode: 404 };

  console.log('---', httpMethod, path);

  console.log(routeHandler);

  return routeHandler.callback({
    ...httpEvent,
    pathParameters: routeHandler.pathParameters
  });
}

module.exports.handler = handler;
