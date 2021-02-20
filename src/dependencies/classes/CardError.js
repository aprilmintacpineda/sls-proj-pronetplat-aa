module.exports = class CardError {
  constructor (error) {
    this.error = error;
    this.type = 'paymentError';
  }
};
