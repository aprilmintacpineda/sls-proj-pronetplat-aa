const Model = require('/opt/nodejs/classes/Model');

module.exports = class ContactRequest extends Model {
  collection = 'contactRequests';

  hasPendingRequest ({ from, to }) {
    return this.countByIndex('contactRequestByUserFromTo', from, to);
  }
};
