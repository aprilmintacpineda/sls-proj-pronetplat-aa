const Model = require('/opt/nodejs/classes/Model');

module.exports = class Contact extends Model {
  constructor () {
    super({ collection: 'contacts' });
  }
};