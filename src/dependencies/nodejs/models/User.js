const { initClient, q } = require('/opt/nodejs/utils/faunadb');

class User {
  constructor ({ email, id }) {
    this.email = email;
    this.id = id;
    this.client = initClient();
    this.instance = null;
  }

  async fetchByEmail () {
    try {
      this.instance = await this.client.query(
        q.Get(
          q.Match(
            q.Index('userByEmail'),
            this.email
          )
        )
      );
    } catch (error) {
      // do nothing
    }
  }
}

module.exports = User;