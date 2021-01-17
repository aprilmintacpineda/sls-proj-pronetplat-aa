const Model = require('/opt/nodejs/classes/Model');

module.exports = class ContactRequest extends Model {
  constructor () {
    super();
    this.collection = 'contactRequests';
  }

  hasPendingRequest ({ senderId, recipientId }) {
    return this.countByIndex(
      'contactRequestBySenderIdRecipientId',
      senderId,
      recipientId
    );
  }

  async getPendingRequestOrNull ({ senderId, recipientId }) {
    let pendingRequest = null;

    try {
      pendingRequest = await this.getByIndex(
        'contactRequestBySenderIdRecipientId',
        senderId,
        recipientId
      );
    } catch (error) {
      console.log('getPendingRequestOrNull', error);
    }

    return pendingRequest;
  }

  getPendingRequest ({ senderId, recipientId }) {
    return this.getByIndex(
      'contactRequestBySenderIdRecipientId',
      senderId,
      recipientId
    );
  }
};
