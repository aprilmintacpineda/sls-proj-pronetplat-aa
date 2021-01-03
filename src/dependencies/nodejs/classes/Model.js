const { query } = require('faunadb');

const { initClient } = require('/opt/nodejs/utils/faunadb');
const { sanitizeFormBody, normalizeData } = require('/opt/nodejs/utils/helpers');

module.exports = class Model {
  wasHardDeleted = false;

  setInstance (newInstance) {
    this.instance = newInstance;
    this.ref = newInstance.ref;

    this.data = normalizeData({
      id: newInstance.ref.id,
      ...newInstance.data
    });
  }

  setRefById (id) {
    this.ref = query.Ref(query.Collection(this.collection), id);
  }

  async getById (id) {
    const client = initClient();

    const newInstance = await client.query(
      query.Get(query.Ref(query.Collection(this.collection), id))
    );

    this.setInstance(newInstance);
  }

  async getByIndex (index, ...values) {
    const client = initClient();

    const newInstance = await client.query(
      query.Get(query.Match(query.Index(index), ...values))
    );

    this.setInstance(newInstance);
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

    this.setInstance(newInstance);
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

    this.setInstance(newInstance);
  }

  async hardDelete () {
    const client = initClient();
    await client.query(query.Delete(this.ref));
    this.wasHardDeleted = true;
  }

  async countByIndex (index, ...values) {
    const client = initClient();
    const {
      data: [data]
    } = await client.query(
      query.Count(
        query.Paginate(query.Match(query.Index(index), ...values), { size: 9999 })
      )
    );

    return parseInt(data);
  }

  toResponseData () {
    const censoredData = (this.censoredData || []).concat(['updatedAt']);

    return Object.keys(this.data).reduce((accumulator, key) => {
      if (!censoredData.includes(key)) accumulator[key] = this.data[key];
      return accumulator;
    }, {});
  }
};
