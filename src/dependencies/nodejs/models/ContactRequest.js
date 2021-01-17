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

  async getPendingRequestIfExists ({ senderId, recipientId }) {
    try {
      await this.getByIndex(
        'contactRequestBySenderIdRecipientId',
        senderId,
        recipientId
      );
    } catch (error) {
      console.log('getPendingRequestIfExists', error);
    }
  }

  getPendingRequest ({ senderId, recipientId }) {
    return this.getByIndex(
      'contactRequestBySenderIdRecipientId',
      senderId,
      recipientId
    );
  }
};
