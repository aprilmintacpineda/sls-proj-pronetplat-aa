const Model = require('dependencies/classes/Model');

module.exports = class ContactRequest extends Model {
  constructor () {
    super();
    this.collection = 'contactRequests';
  }

  hasPendingRequest ({ senderId, recipientId }) {
    return this.exists(
      'contactRequestBySenderIdRecipientId',
      senderId,
      recipientId
    );
  }

  getPendingRequestIfExists ({ senderId, recipientId }) {
    return this.getByIndexIfExists(
      'contactRequestBySenderIdRecipientId',
      senderId,
      recipientId
    );
  }

  getPendingRequest ({ senderId, recipientId }) {
    return this.getByIndex(
      'contactRequestBySenderIdRecipientId',
      senderId,
      recipientId
    );
  }

  async create (data) {
    return Promise.all([
      super.create(data),
      this.callUDF(
        'updateUserBadgeCount',
        data.recipientId,
        'receivedContactRequestsCount',
        1
      )
    ]);
  }
};
