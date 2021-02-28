const { query, Client } = require('faunadb');
const { sanitizeFormBody } = require('./helpers');

module.exports.initClient = () => {
  return new Client({
    secret: process.env.faunadbSecret
  });
};

module.exports.update = (ref, data) => {
  return query.Update(ref, {
    data: {
      ...sanitizeFormBody(data),
      updatedAt: query.Format('%t', query.Now())
    }
  });
};

module.exports.updateById = (collection, id, data) => {
  return this.update(
    query.Ref(query.Collection(collection), id),
    data
  );
};

module.exports.create = (collection, data) => {
  return query.Create(query.Collection(collection), {
    data: {
      ...sanitizeFormBody(data),
      createdAt: query.Format('%t', query.Now()),
      updatedAt: query.Format('%t', query.Now())
    }
  });
};

module.exports.createOrUpdate = ({
  index,
  args,
  collection,
  data
}) => {
  const match = query.Match(query.Index(index), ...args);

  return query.If(
    query.Exists(match),
    this.update(this.selectRef(query.Get(match)), data),
    this.create(collection, data)
  );
};

module.exports.createIfNotExists = ({
  index,
  args,
  data,
  collection
}) => {
  return query.If(
    query.Exists(query.Match(query.Index(index), ...args)),
    null,
    this.create(collection, data)
  );
};

module.exports.getByIndex = (index, ...args) => {
  return query.Get(query.Match(query.Index(index), ...args));
};

module.exports.getById = (collection, id) => {
  return query.Get(query.Ref(query.Collection(collection), id));
};

module.exports.hasCompletedSetupQuery = inValue => {
  return query.And(
    query.ContainsPath(['data', 'firstName'], inValue),
    query.ContainsPath(['data', 'surname'], inValue),
    query.ContainsPath(['data', 'gender'], inValue),
    query.ContainsPath(['data', 'jobTitle'], inValue),
    query.ContainsPath(['data', 'profilePicture'], inValue),
    query.ContainsPath(['data', 'emailVerifiedAt'], inValue)
  );
};

module.exports.isOnBlockList = (authUser, contactId) => {
  return query.Or(
    query.Exists(
      query.Match(
        query.Index('userBlockingsByBlockerIdUserId'),
        authUser.id,
        contactId
      )
    ),
    query.Exists(
      query.Match(
        query.Index('userBlockingsByBlockerIdUserId'),
        contactId,
        authUser.id
      )
    )
  );
};

module.exports.hasPendingContactRequest = (authUser, contactId) => {
  return query.Or(
    query.Exists(
      query.Match(
        query.Index('contactRequestBySenderIdRecipientId'),
        contactId,
        authUser.id
      )
    ),
    query.Exists(
      query.Match(
        query.Index('contactRequestBySenderIdRecipientId'),
        authUser.id,
        contactId
      )
    )
  );
};

module.exports.hardDeleteIfExists = (index, args) => {
  const match = query.Match(query.Index(index), ...args);

  return query.If(
    query.Exists(match),
    query.Delete(this.selectRef(query.Get(match))),
    null
  );
};

module.exports.hardDeleteByIndex = (index, ...args) => {
  return query.Delete(
    query.Select(
      ['ref'],
      query.Get(query.Match(query.Index(index), ...args))
    )
  );
};

module.exports.getTimeOffset = (isPast = false) => {
  if (isPast) {
    return query.Format(
      '%t',
      query.TimeSubtract(query.Now(), 5, 'minutes')
    );
  }

  return query.Format(
    '%t',
    query.TimeAdd(query.Now(), 5, 'minutes')
  );
};

module.exports.selectRef = from => {
  return query.Select(['ref'], from);
};

module.exports.toResponseData = response => ({
  ...response.data,
  id: response.ref.id
});
