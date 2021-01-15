module.exports = class HttpError {
  constructor ({ statusCode, message = null }) {
    this.type = 'httpError';
    this.statusCode = statusCode;
    this.message = message;
  }

  toResponse () {
    const response = { statusCode: this.statusCode };
    if (this.message)
      response.body = JSON.stringify({ message: this.message });
    return response;
  }
};
