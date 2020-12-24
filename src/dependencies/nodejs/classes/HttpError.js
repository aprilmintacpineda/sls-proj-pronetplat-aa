module.exports = class HttpError {
  type = 'httpError';

  constructor (statusCode) {
    this.statusCode = statusCode;
  }
};
