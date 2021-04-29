const { query } = require('faunadb');
const {
  initClient,
  getByIndex,
  toResponseData,
  getByIndexIfExists
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { invokeEvent } = require('dependencies/utils/lambda');

async function handler ({
  params: { contactId, nextToken },
  authUser
}) {
  const faunadb = initClient();

  let result;

  try {
    result = await faunadb.query(
      query.If(
        query.Exists(
          query.Match(
            query.Index('userBlockingsByBlockerIdUserId'),
            authUser.id,
            contactId
          )
        ),
        query.Abort('contactBlocked'),
        query.If(
          query.Exists(
            query.Match(
              query.Index('userBlockingsByBlockerIdUserId'),
              contactId,
              authUser.id
            )
          ),
          query.Abort('blockedByUser'),
          query.If(
            query.Exists(
              query.Match(
                query.Index('contactByOwnerContact'),
                authUser.id,
                contactId
              )
            ),
            query.Map(
              query.Paginate(
                query.Union(
                  query.Match(
                    query.Index('contactDetailsByCloseFriendsOnly'),
                    contactId,
                    false
                  ),
                  query.Match(
                    query.Index('contactDetailsByCloseFriendsOnly'),
                    contactId,
                    query.Select(
                      ['data', 'isCloseFriend'],
                      getByIndexIfExists(
                        'contactByOwnerContact',
                        contactId,
                        authUser.id
                      )
                    )
                  )
                ),
                {
                  size: 20,
                  after: nextToken
                    ? query.Ref(
                        query.Collection('contactDetails'),
                        nextToken
                      )
                    : []
                }
              ),
              query.Lambda(['ref'], query.Get(query.Var('ref')))
            ),
            query.If(
              query.Exists(
                query.Match(
                  query.Index('contactRequestBySenderIdRecipientId'),
                  authUser.id,
                  contactId
                )
              ),
              {
                sentContactRequest: getByIndex(
                  'contactRequestBySenderIdRecipientId',
                  authUser.id,
                  contactId
                )
              },
              query.If(
                query.Exists(
                  query.Match(
                    query.Index(
                      'contactRequestBySenderIdRecipientId'
                    ),
                    contactId,
                    authUser.id
                  )
                ),
                {
                  receivedContactRequest: getByIndex(
                    'contactRequestBySenderIdRecipientId',
                    contactId,
                    authUser.id
                  )
                },
                query.Abort('contactDoesNotExist')
              )
            )
          )
        )
      )
    );

    if (result.sentContactRequest) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: {
            sentContactRequest: toResponseData(
              result.sentContactRequest
            )
          }
        })
      };
    }

    if (result.receivedContactRequest) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: {
            receivedContactRequest: toResponseData(
              result.receivedContactRequest
            )
          }
        })
      };
    }
  } catch (error) {
    console.log('error', error);

    switch (error.description) {
      case 'contactBlocked':
        return {
          statusCode: 200,
          body: JSON.stringify({
            data: {
              contactBlocked: true
            }
          })
        };
      case 'blockedByUser':
        return {
          statusCode: 200,
          body: JSON.stringify({
            data: {
              blockedByUser: true
            }
          })
        };
      case 'contactDoesNotExist':
        return { statusCode: 404 };
    }

    return { statusCode: 500 };
  }

  await invokeEvent({
    functionName: process.env.fn_incrementNumTimesOpened,
    payload: { id: contactId }
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(contactDetail => ({
        ...contactDetail.data,
        id: contactDetail.ref.id
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});