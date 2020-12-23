const {
  values: { FaunaTime, FaunaDate },
  query
} = require('faunadb');

const initClient = require('/opt/nodejs/utils/faunadb');

function normalizeData (unnormalizedData) {
  switch (unnormalizedData.constructor) {
    case Array:
      return unnormalizedData.map(field => normalizeData(field));
    case Object:
      return Object.keys(unnormalizedData).reduce((accumulator, key) => {
        accumulator[key] = normalizeData(unnormalizedData[key]);
        return accumulator;
      }, {});
    case FaunaTime:
    case FaunaDate:
      return unnormalizedData.value;
  }

  return unnormalizedData;
}

class Model {
  constructor (collection) {
    this.collection = collection;
    this.hasBeenErased = false;
  }

  async resetInstance (promisedData) {
    const instance = await promisedData;
    this.instance = instance;
    this.data = normalizeData(instance.data);
  }

  async getById (id) {
    const client = initClient();

    await this.resetInstance(
      client.query(query.Get(query.Ref(query.Collection(this.collection), id)))
    );
  }

  async getByIndex (index, ...values) {
    const client = initClient();

    await this.resetInstance(client.query(query.Get(query.Match(index, ...values))));
  }

  async create (data) {
    const client = initClient();

    await this.resetInstance(
      client.query(
        query.Create(query.Collection(this.collection), {
          data: {
            ...data,
            createdAt: query.Now()
          }
        })
      )
    );
  }

  async update (data) {
    const client = initClient();

    await client.query(
      query.Update(this.instance.ref, {
        data: {
          ...data,
          updatedAt: query.Now()
        }
      })
    );
  }

  async erase () {
    const client = initClient();
    await client.query(query.Delete(this.instance.ref));
    this.hasBeenErased = true;
  }

  toString () {
    return JSON.stringify(this.data);
  }
}

module.exports = Model;
