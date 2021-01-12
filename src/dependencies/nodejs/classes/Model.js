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

  async updateById (id, data) {
    const client = initClient();

    const newInstance = await client.query(
      query.Update(query.Ref(query.Collection(this.collection), id), {
        data: {
          ...sanitizeFormBody(data),
          updatedAt: query.Now()
        }
      })
    );

    this.setInstance(newInstance);
  }

  async updateByIndex ({ index, data, args = [] }) {
    const client = initClient();

    const newInstance = await client.query(
      query.Let(
        {
          document: query.Get(query.Match(index, ...args))
        },
        query.Update(query.Select(['ref'], query.Var('document')), { data })
      )
    );

    this.setInstance(newInstance);
  }

  async createIfNotExists ({ index, args, data }) {
    const client = initClient();
    const match = query.Match(query.Index(index), ...args);

    const { doesExist, newInstance } = await client.query(
      query.Let(
        {
          doesExist: query.Exists(match)
        },
        query.If(query.Var('doesExist'), query.Get(match), {
          doesExist: query.Var('doesExist'),
          newInstance: query.Create(query.Collection(this.collection), {
            data: {
              ...sanitizeFormBody(data),
              createdAt: query.Now()
            }
          })
        })
      )
    );

    console.log(doesExist, newInstance);

    this.setInstance(newInstance);
    return doesExist;
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
    } = await client.query(query.Count(query.Match(query.Index(index), ...values)));

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
