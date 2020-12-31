const {
  values: { FaunaTime, FaunaDate },
  query
} = require('faunadb');

const { initClient } = require('/opt/nodejs/utils/faunadb');
const { sanitizeFormBody } = require('/opt/nodejs/utils/helpers');

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

module.exports = class Model {
  constructor ({ collection, censoredData = [] }) {
    this.collection = collection;
    this.censoredData = ['updatedAt'].concat(censoredData);
    this.wasHardDeleted = false;
  }

  resetInstance (newInstance) {
    this.instance = newInstance;
    this.ref = newInstance.ref;

    this.data = normalizeData({
      id: newInstance.ref.id,
      ...newInstance.data
    });
  }

  async getById (id) {
    const client = initClient();

    const newInstance = await client.query(
      query.Get(query.Ref(query.Collection(this.collection), id))
    );

    this.resetInstance(newInstance);
  }

  async getByIndex (index, ...values) {
    const client = initClient();

    const newInstance = await client.query(
      query.Get(query.Match(query.Index(index), ...values))
    );

    this.resetInstance(newInstance);
  }

  async create (data) {
    const client = initClient();

    const newInstance = await client.query(
      query.Create(query.Collection(this.collection), {
        data: {
          ...sanitizeFormBody(data),
          createdAt: query.Now()
        }
      })
    );

    this.resetInstance(newInstance);
  }

  async update (data) {
    const client = initClient();

    const newInstance = await client.query(
      query.Update(this.ref, {
        data: {
          ...sanitizeFormBody(data),
          updatedAt: query.Now()
        }
      })
    );

    this.resetInstance(newInstance);
  }

  async hardDelete () {
    const client = initClient();
    await client.query(query.Delete(this.ref));
    this.wasHardDeleted = true;
  }

  toResponseData () {
    // automatically considered anything that has "hashed"
    // in it's name as censored.
    return Object.keys(this.data).reduce((accumulator, key) => {
      if (!this.censoredData.includes(key)) accumulator[key] = this.data[key];

      return accumulator;
    }, {});
  }
};
