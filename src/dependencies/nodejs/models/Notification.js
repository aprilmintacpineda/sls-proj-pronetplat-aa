const Model = require('/opt/nodejs/classes/Model');

module.exports = class Notification extends Model {
  constructor () {
    super();
    this.collection = 'notifications';
  }
};
