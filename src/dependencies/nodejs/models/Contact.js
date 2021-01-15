const Model = require('/opt/nodejs/classes/Model');

module.exports = class Contact extends Model {
  constructor () {
    super();
    this.collection = 'contacts';
  }

  async isInContact (ownerId, contactId) {
    let isInContact = false;

    try {
      await this.getByIndex(
        'contactByOwnerContact',
        ownerId,
        contactId
      );
      isInContact = true;
    } catch (error) {
      // do nothing
    }

    return isInContact;
  }
};
