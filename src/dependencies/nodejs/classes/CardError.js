module.exports = class CardError {
  type = 'paymentError';

  constructor (error) {
    this.error = error;
  }
};
