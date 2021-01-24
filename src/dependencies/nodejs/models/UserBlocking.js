const Model = require('dependencies/nodejs/classes/Model');

module.exports = class UserBlocking extends Model {
  constructor () {
    super();
    this.collection = 'userBlockings';
  }

  async wasBlocked (userId1, userId2) {
    const [
      wasBlockedByUserId1,
      wasBlockedByUserId2
    ] = await Promise.all([
      this.countByIndex(
        'userBlockingsByBlockerIdUserId',
        userId1,
        userId2
      ),
      this.countByIndex(
        'userBlockingsByBlockerIdUserId',
        userId2,
        userId1
      )
    ]);

    return Boolean(wasBlockedByUserId1, wasBlockedByUserId2);
  }
};
