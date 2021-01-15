const Model = require('/opt/nodejs/classes/Model');

module.exports = class User extends Model {
  constructor () {
    super();
    this.collection = 'users';
    this.censoredData = [
      'hashedEmailVerificationCode',
      'hashedPassword'
    ];
  }

  getByEmail (email) {
    return this.getByIndex('userByEmail', email);
  }
};
