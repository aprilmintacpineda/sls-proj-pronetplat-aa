const Model = require('/opt/nodejs/classes/Model');

module.exports = class ContactRequest extends Model {
  constructor () {
    super({ collection: 'contactRequests' });
  }

  countReceivedRequests (recipientId) {
    return this.countByIndex('contactRequestsByRecipientId', recipientId);
  }
};
