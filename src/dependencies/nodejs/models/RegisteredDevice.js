const Model = require('dependencies/nodejs/classes/Model');

module.exports = class RegisteredDevice extends Model {
  constructor () {
    super();
    this.collection = 'registeredDevices';
  }
};
