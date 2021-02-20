const Model = require('dependencies/classes/Model');

module.exports = class RegisteredDevice extends Model {
  constructor () {
    super();
    this.collection = 'registeredDevices';
  }
};
