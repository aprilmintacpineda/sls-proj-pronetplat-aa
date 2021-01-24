const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  sanitizeFormBody
} = require('dependencies/nodejs/utils/helpers');
const { query } = require('faunadb');

module.exports = class Model {
  constructor () {
    this.wasHardDeleted = false;
    this.data = null;
    this.instance = null;
    this.ref = null;
  }

  setInstance (newInstance) {
    this.instance = newInstance;
    this.ref = newInstance.ref;

    newInstance.data.id = newInstance.ref.id;
    this.data = newInstance.data;
  }

  throwIfHasInstance (method) {
    if (this.instance) {
      throw new Error(
        `Cannot do ${method} with an existing instance in model`
      );
    }
  }

  async getById (id) {
    this.throwIfHasInstance('getById');

    const client = initClient();

    const newInstance = await client.query(
      query.Get(query.Ref(query.Collection(this.collection), id))
    );

    this.setInstance(newInstance);
  }

  async getByIndex (index, ...values) {
    this.throwIfHasInstance('getByIndex');

    const client = initClient();

    const newInstance = await client.query(
      query.Get(query.Match(query.Index(index), ...values))
    );

    this.setInstance(newInstance);
  }

  async create (data) {
    this.throwIfHasInstance('create');

    const client = initClient();

    const newInstance = await client.query(
      query.Create(query.Collection(this.collection), {
        data: {
          ...sanitizeFormBody(data),
          createdAt: query.Format('%t', query.Now())
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
          updatedAt: query.Format('%t', query.Now())
        }
      })
    );

    this.setInstance(newInstance);
  }

  updateById (id, data) {
    this.throwIfHasInstance('updateById');
    this.ref = query.Ref(query.Collection(this.collection), id);
    return this.update(data);
  }

  async updateByIndex ({ index, data, args = [] }) {
    this.throwIfHasInstance('updateByIndex');

    const client = initClient();

    const newInstance = await client.query(
      query.Update(
        query.Select(
          ['ref'],
          query.Get(query.Match(index, ...args))
        ),
        {
          data: {
            ...sanitizeFormBody(data),
            updatedAt: query.Format('%t', query.Now())
          }
        }
      )
    );

    this.setInstance(newInstance);
  }

  async createOrUpdate ({ index, args, data }) {
    this.throwIfHasInstance('createOrUpdate');

    const client = initClient();
    const match = query.Match(query.Index(index), ...args);

    const newInstance = await client.query(
      query.If(
        query.Exists(match),
        query.Update(query.Select(['ref'], query.Get(match)), {
          data: {
            ...sanitizeFormBody(data),
            updatedAt: query.Format('%t', query.Now())
          }
        }),
        query.Create(query.Collection(this.collection), {
          data: {
            ...sanitizeFormBody(data),
            createdAt: query.Format('%t', query.Now())
          }
        })
      )
    );

    this.setInstance(newInstance);
  }

  async createIfNotExists ({ index, args, data }) {
    this.throwIfHasInstance('createIfNotExists');

    const client = initClient();
    const match = query.Match(query.Index(index), ...args);

    const response = await client.query(
      query.If(
        query.Exists(match),
        {
          wasCreated: false,
          newInstance: query.Get(match)
        },
        {
          wasCreated: true,
          newInstance: query.Create(
            query.Collection(this.collection),
            {
              data: {
                ...sanitizeFormBody(data),
                createdAt: query.Format('%t', query.Now())
              }
            }
          )
        }
      )
    );

    const { wasCreated, newInstance } = response;
    this.setInstance(newInstance);
    return wasCreated;
  }

  async hardDelete () {
    const client = initClient();
    await client.query(query.Delete(this.ref));
    this.wasHardDeleted = true;
  }

  hardDeleteById (id) {
    this.throwIfHasInstance('hardDeleteById');
    this.ref = query.Ref(query.Collection(this.collection), id);
    return this.hardDelete();
  }

  async hardDeleteIfExists (index, ...args) {
    const client = initClient();

    const match = query.Match(index, ...args);

    const { wasDeleted } = await client.query(
      query.If(
        query.Exists(match),
        query.Let(
          {
            document: query.Get(match),
            deletedDocument: query.Delete(
              query.Select(['ref'], query.Var('document'))
            )
          },
          {
            wasDeleted: true
          }
        ),
        {
          wasDeleted: false
        }
      )
    );

    this.wasHardDeleted = true;
    return wasDeleted;
  }

  async countByIndex (index, ...values) {
    const client = initClient();
    const count = await client.query(
      query.Count(query.Match(query.Index(index), ...values))
    );

    return parseInt(count);
  }

  toResponseData () {
    if (!this.data) {
      throw new Error(
        'toResponseData was called but no data exists in model.'
      );
    }

    if (!this.censoredData) return this.data;

    return Object.keys(this.data).reduce((accumulator, key) => {
      if (!this.censoredData.includes(key))
        accumulator[key] = this.data[key];
      return accumulator;
    }, {});
  }
};
