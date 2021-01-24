const Model = require('dependencies/nodejs/classes/Model');

module.exports = class Contact extends Model {
  constructor () {
    super();
    this.collection = 'contacts';
  }
};
