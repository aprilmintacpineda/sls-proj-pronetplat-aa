const { initClient, q } = require('/opt/nodejs/utils/faunadb');

class User {
  constructor ({ email, id }) {
    this.email = email;
    this.id = id;
    this.client = initClient();
    this.instance = null;
  }

  async fetchByEmail () {
    const user = this.client.query(
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