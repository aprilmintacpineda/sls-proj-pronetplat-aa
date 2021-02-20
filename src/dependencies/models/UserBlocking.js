const Model = require('dependencies/classes/Model');

module.exports = class UserBlocking extends Model {
  constructor () {
    super();
    this.collection = 'userBlockings';
  }

  async wasBlocked (userId1, userId2) {
    const [
      wasBlockedByUser1,
      wasBlockedByUser2
    ] = await Promise.all([
      this.exists(
        'userBlockingsByBlockerIdUserId',
        userId1,
        userId2
      ),
      this.exists('userBlockingsByBlockerIdUserId', userId2, userId1)
    ]);

    return Boolean(wasBlockedByUser1 || wasBlockedByUser2);
  }
};
