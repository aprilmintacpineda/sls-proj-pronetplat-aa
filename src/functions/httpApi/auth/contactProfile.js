const { query } = require('faunadb');
const {
  initClient,
  getByIndex,
  toResponseData
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
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
                contactId,
                authUser.id
              )
            ),
            {
              contactDetailsResult: query.Map(
                query.Paginate(
                  query.Union(
                    query.Match(
                      query.Index(
                        'contactDetailsByCloseFriendsOnly'
                      ),
                      contactId,
                      false
                    ),
                    query.Match(
                      query.Index(
                        'contactDetailsByCloseFriendsOnly'
                      ),
                      contactId,
                      query.Select(
                        ['data', 'isCloseFriend'],
                        getByIndex(
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
              contactInfo: getByIndex(
                'contactByOwnerContact',
                contactId,
                authUser.id
              )
            },
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
    eventName: 'incrementNumTimesOpened',
    payload: { id: contactId }
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: {
        isCloseFriend: result.contactInfo.data.isCloseFriend,
        contactDetails: result.contactDetailsResult.data.map(
          contactDetail => ({
            ...contactDetail.data,
            id: contactDetail.ref.id
          })
        )
      },
      nextToken: result.contactDetailsResult.after?.[0].id || null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
