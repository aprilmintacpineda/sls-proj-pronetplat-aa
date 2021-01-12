const Model = require('/opt/nodejs/classes/Model');

module.exports = class User extends Model {
  collection = 'users';
  censoredData = ['hashedEmailVerificationCode', 'hashedPassword'];

  getByEmail (email) {
    return this.getByIndex('userByEmail', email);
  }
};
