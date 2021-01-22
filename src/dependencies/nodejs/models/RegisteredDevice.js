const Model = require('dependencies/nodejs/classes/Model');

module.exports = class RegisteredDevices extends Model {
  constructor () {
    super();
    this.collection = 'registeredDevices';
  }
};
