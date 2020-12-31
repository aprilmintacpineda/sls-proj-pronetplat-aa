const Model = require('/opt/nodejs/classes/Model');

module.exports = class RegisteredDevices extends Model {
  constructor () {
    super({ collection: 'registeredDevices' });
  }
};
