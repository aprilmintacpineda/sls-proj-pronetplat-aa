const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const { sanitizeFormBody } = require('dependencies/utils/helpers');

module.exports = class Model {
  constructor () {
    this.wasHardDeleted = false;
    this.data = null;
    this.instance = null;
    this.ref = null;
    this.client = initClient();
  }

  setInstance (newInstance) {
    this.instance = newInstance;
    this.ref = newInstance.ref;
    newInstance.data.id = newInstance.ref.id;
    this.data = newInstance.data;
  }

  throwIfHasRef (method) {
    if (this.instance) {
      throw new Error(
        `Cannot do ${method} with an existing instance in model`
      );
    }
  }

  throwIfNoRef (method) {
    if (!this.ref) {
      throw new Error(
        `Cannot do ${method} with no existing instance in model`
      );
    }
  }

  async getById (id) {
    this.throwIfHasRef('getById');

    const newInstance = await this.client.query(
      query.Get(query.Ref(query.Collection(this.collection), id))
    );

    this.setInstance(newInstance);
  }

  async getByIndexIfExists (index, ...values) {
    this.throwIfHasRef('getByIndexIfExists');

    const match = query.Match(query.Index(index), ...values);

    const newInstance = await this.client.query(
      query.If(query.Exists(match), query.Get(match), null)
    );

    if (newInstance) this.setInstance(newInstance);
  }

  async getByIndex (index, ...values) {
    this.throwIfHasRef('getByIndex');

    const newInstance = await this.client.query(
      query.Get(query.Match(query.Index(index), ...values))
    );

    this.setInstance(newInstance);
  }

  async create (data) {
    this.throwIfHasRef('create');

    const newInstance = await this.client.query(
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
    this.throwIfNoRef('update');

    const newInstance = await this.client.query(
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
    this.throwIfHasRef('updateById');
    this.ref = query.Ref(query.Collection(this.collection), id);
    return this.update(data);
  }

  async updateByIndex ({ index, data, args = [] }) {
    this.throwIfHasRef('updateByIndex');

    const newInstance = await this.client.query(
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
    this.throwIfHasRef('createOrUpdate');

    const match = query.Match(query.Index(index), ...args);

    const newInstance = await this.client.query(
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
    this.throwIfHasRef('createIfNotExists');

    const match = query.Match(query.Index(index), ...args);

    const response = await this.client.query(
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
    this.throwIfNoRef('hardDelete');

    const newInstance = await this.client.query(
      query.Delete(this.ref)
    );

    this.setInstance(newInstance);
    this.wasHardDeleted = true;
  }

  hardDeleteById (id) {
    this.throwIfHasRef('hardDeleteById');

    this.ref = query.Ref(query.Collection(this.collection), id);
    return this.hardDelete();
  }

  async hardDeleteByIndex (index, ...args) {
    this.throwIfHasRef('hardDeleteByIndex');

    const newInstance = await this.client.query(
      query.Delete(
        query.Select(['ref'], query.Get(query.Match(index, ...args)))
      )
    );

    this.setInstance(newInstance);
    this.wasHardDeleted = true;
  }

  async hardDeleteIfExists (index, ...args) {
    this.throwIfHasRef('hardDeleteIfExists');

    const match = query.Match(index, ...args);

    const { wasDeleted, instance } = await this.client.query(
      query.If(
        query.Exists(match),
        {
          instance: query.Delete(
            query.Select(['ref'], query.Get(match))
          ),
          wasDeleted: true
        },
        {
          wasDeleted: false
        }
      )
    );

    if (wasDeleted) {
      this.setInstance(instance);
      this.wasHardDeleted = true;
    }

    return Boolean(wasDeleted);
  }

  exists (index, ...values) {
    return this.client.query(
      query.Exists(query.Match(query.Index(index), ...values))
    );
  }

  callUDF (name, ...args) {
    return this.client.query(query.Call(name, args));
  }

  toResponseData () {
    this.throwIfNoRef('toResponseData');

    if (!this.censoredData) return this.data;

    return Object.keys(this.data).reduce((accumulator, key) => {
      if (!this.censoredData.includes(key))
        accumulator[key] = this.data[key];
      return accumulator;
    }, {});
  }
};
