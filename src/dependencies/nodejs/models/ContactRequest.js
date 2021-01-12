const Model = require('/opt/nodejs/classes/Model');

module.exports = class ContactRequest extends Model {
  collection = 'contactRequests';

  hasPendingRequest ({ senderId, recipientId }) {
    return this.countByIndex(
      'contactRequestBySenderIdRecipientId',
      senderId,
      recipientId
    );
  }

  getPendingRequest ({ senderId, recipientId }) {
    return this.getByIndex('contactRequestBySenderIdRecipientId', senderId, recipientId);
  }
};
