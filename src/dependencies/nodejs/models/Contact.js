const Model = require('/opt/nodejs/classes/Model');

module.exports = class Contact extends Model {
  collection = 'contacts';

  async isInContact (ownerId, contactId) {
    let isInContact = false;

    try {
      const contact = await this.getByIndex('contactByOwnerContact', ownerId, contactId);

      console.log(contact);

      isInContact = true;
    } catch (error) {
      console.log(error);
      // do nothing
    }

    return isInContact;
  }
};
