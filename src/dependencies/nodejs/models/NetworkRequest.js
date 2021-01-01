const Model = require('/opt/nodejs/classes/Model');

module.exports = class NetworkRequest extends Model {
  constructor () {
    super({ collection: 'networkRequests' });
  }

  countReceivedRequests (recipientId) {
    return this.countByIndex('networkRequestsByRecipientId', recipientId);
  }
};
