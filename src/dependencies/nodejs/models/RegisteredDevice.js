const Model = require('/opt/nodejs/classes/Model');

module.exports = class RegisteredDevices extends Model {
  constructor () {
    super();
    this.collection = 'registeredDevices';
  }
};
