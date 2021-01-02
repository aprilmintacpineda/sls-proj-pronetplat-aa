const Model = require('/opt/nodejs/classes/Model');

module.exports = class ContactRequest extends Model {
  collection = 'contactRequests';

  countReceivedRequests (recipientId) {
    return this.countByIndex('contactRequestsByRecipient', recipientId);
  }

  hasPendingRequest ({ from, to }) {
    return this.countByIndex('contactRequestByUserFromTo', from, to);
  }
};
