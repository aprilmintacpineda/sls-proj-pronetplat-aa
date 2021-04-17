const { query, Client } = require('faunadb');
const { sanitizeFormBody } = require('./helpers');

function update (ref, data) {
  return query.Update(ref, {
    data: {
      ...sanitizeFormBody(data),
      updatedAt: query.Format('%t', query.Now())
    }
  });
}

module.exports.update = update;

function create (collection, data) {
  return query.Create(query.Collection(collection), {
    data: {
      ...sanitizeFormBody(data),
      createdAt: query.Format('%t', query.Now()),
      updatedAt: query.Format('%t', query.Now())
    }
  });
}

module.exports.create = create;

function selectRef (from) {
  return query.Select(['ref'], from);
}

module.exports.selectRef = selectRef;

function ifOwnedByUser (userId, getExpression, doExpression) {
  return query.Let(
    {
      document: getExpression
    },
    query.If(
      query.Not(
        query.Equals(
          query.Select(['data', 'userId'], query.Var('document')),
          userId
        )
      ),
      query.Abort('authUserDoesNotOwnDocument'),
      doExpression
    )
  );
}

module.exports.ifOwnedByUser = ifOwnedByUser;

module.exports.initClient = () => {
  return new Client({
    secret: process.env.faunadbSecret
  });
};

module.exports.updateById = (collection, id, data) => {
  return update(query.Ref(query.Collection(collection), id), data);
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
    update(selectRef(query.Get(match)), data),
    create(collection, data)
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
    create(collection, data)
  );
};

function getIfExists (pointer) {
  return query.If(query.Exists(pointer), query.Get(pointer), null);
}

module.exports.getByIndex = (index, ...args) => {
  return query.Get(query.Match(query.Index(index), ...args));
};

module.exports.getByIndexIfExists = (index, ...args) => {
  return getIfExists(query.Match(query.Index(index), ...args));
};

module.exports.getById = (collection, id) => {
  return query.Get(query.Ref(query.Collection(collection), id));
};

module.exports.hasCompletedSetupQuery = userData => {
  return query.And(
    query.ContainsPath(['firstName'], userData),
    query.ContainsPath(['surname'], userData),
    query.ContainsPath(['gender'], userData),
    query.ContainsPath(['jobTitle'], userData),
    query.ContainsPath(['profilePicture'], userData),
    query.ContainsPath(['emailVerifiedAt'], userData)
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

module.exports.hardDeleteIfExists = (index, ...args) => {
  const match = query.Match(query.Index(index), ...args);

  return query.If(
    query.Exists(match),
    query.Delete(selectRef(query.Get(match))),
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

module.exports.getTimeOffset = (inPast = false) => {
  return query.Format(
    '%t',
    inPast
      ? query.TimeSubtract(query.Now(), 5, 'minutes')
      : query.TimeAdd(query.Now(), 5, 'minutes')
  );
};

module.exports.updateIfOwnedByUser = (
  userId,
  getExpression,
  data
) => {
  return ifOwnedByUser(
    userId,
    getExpression,
    update(selectRef(query.Var('document')), data)
  );
};

module.exports.hardDeleteIfOwnedByUser = (userId, getExpression) => {
  return ifOwnedByUser(
    userId,
    getExpression,
    query.Delete(selectRef(query.Var('document')))
  );
};

module.exports.ifCompatibleTestAccountTypes = (
  userData1,
  userData2,
  queryCommand
) => {
  return query.If(
    query.Equals(
      query.Select(['isTestAccount'], userData1),
      query.Select(['isTestAccount'], userData2)
    ),
    queryCommand,
    query.Abort('NotCompatibleTestAccountTypes')
  );
};

module.exports.selectData = fromValue => {
  return query.Select(['data'], fromValue);
};

module.exports.toResponseData = response => ({
  ...response.data,
  id: response.ref.id
});
