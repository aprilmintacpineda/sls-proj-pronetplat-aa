const Model = require('dependencies/classes/Model');

module.exports = class Contact extends Model {
  constructor () {
    super();
    this.collection = 'contacts';
  }
};
