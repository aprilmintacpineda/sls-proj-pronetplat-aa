const { initClient, q } = require('/opt/nodejs/utils/faunadb');

class User {
  constructor ({ email, id }) {
    this.email = email;
    this.id = id;
    this.client = initClient();
    this.instance = null;
  }

  async fetchByEmail () {
    console.log('fetchByEmail');

    const user = await this.client.query(
      q.Get(
        q.Match(
          q.Index('userByEmail'),
          this.email
        )
      )
    );

    console.log(user);
  }
}

module.exports = User;