const Model = require('dependencies/nodejs/classes/Model');

module.exports = class UserBlocking extends Model {
  constructor () {
    super();
    this.collection = 'userBlockings';
  }
};
