const { match } = require('path-to-regexp');
module.exports = class Routing {
  routes = {
    get: [],
    post: [],
    delete: [],
    patch: []
  };

  add (method, path, callback) {
    this.routes[method].push([
      match(path.startsWith('/') ? path : `/${path}`),
      callback
    ]);
  }

  get (path, callback) {
    this.add('get', path, callback);
  }

  post (path, callback) {
    this.add('post', path, callback);
  }

  delete (path, callback) {
    this.add('delete', path, callback);
  }

  patch (path, callback) {
    this.add('patch', path, callback);
  }

  getRouteHandler (httpMethod, path) {
    const httpMethodRoutes = this.routes[httpMethod.toLowerCase()];

    if (!httpMethodRoutes) {
      console.log('httpMethod', httpMethod, ' was not found');
      return null;
    }

    for (let a = 0, maxA = httpMethodRoutes.length; a < maxA; a++) {
      const [matchCallback, callback] = httpMethodRoutes[a];
      const result = matchCallback(path);

      if (result) {
        return {
          callback,
          pathParameters: result.params
        };
      }
    }

    console.log('path', path, ' was not found');
    return null;
  }
};
