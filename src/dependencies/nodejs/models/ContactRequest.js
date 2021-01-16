const Model = require('/opt/nodejs/classes/Model');

module.exports = class ContactRequest extends Model {
  constructor () {
    super();
    this.collection = 'contactRequests';
  }

  hasPendingRequest ({ senderId, recipientId }) {
    return Boolean(
      this.countByIndex(
        'contactRequestBySenderIdRecipientId',
        senderId,
        recipientId
      )
    );
  }

  getPendingRequest ({ senderId, recipientId }) {
    return this.getByIndex(
      'contactRequestBySenderIdRecipientId',
      senderId,
      recipientId
    );
  }
};
