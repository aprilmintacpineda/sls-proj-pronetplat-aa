const Model = require('dependencies/classes/Model');

module.exports = class Notification extends Model {
  constructor () {
    super();
    this.collection = 'notifications';
  }

  async create (data) {
    return Promise.all([
      super.create(data),
      this.callUDF(
        'updateUserBadgeCount',
        data.userId,
        'notificationsCount',
        1
      )
    ]);
  }
};
