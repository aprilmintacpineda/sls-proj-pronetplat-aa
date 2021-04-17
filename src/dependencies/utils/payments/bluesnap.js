const { isPast } = require('date-fns');
const CardError = require('dependencies/classes/CardError');
const fetch = require('node-fetch');

const username = 'API_1602153518351925061784';
const password = '$SPc!p18O@d0';

const authToken = Buffer.from(`${username}:${password}`).toString(
  'base64'
);
const headers = {
  Authorization: `Basic ${authToken}`,
  'Content-Type': 'application/json'
};

function getSubscriptionData (data) {
  const {
    status,
    nextChargeDate = null,
    paymentSource: {
      creditCardInfo: {
        creditCard: {
          cardLastFourDigits,
          cardType,
          cardSubType,
          expirationMonth,
          expirationYear
        }
      }
    }
  } = data;

  return {
    status,
    nextChargeDate,
    cardLastFourDigits,
    cardType,
    cardSubType,
    expirationMonth,
    expirationYear,
    isActive: status === 'ACTIVE'
  };
}

module.exports.subscribe = async ({
  planId,
  creditCard,
  payerInfo
}) => {
  let response = await fetch(
    'https://sandbox.bluesnap.com/services/2/recurring/subscriptions',
    {
      method: 'post',
      headers,
      body: JSON.stringify({
        planId,
        authorizedByShopper: true,
        payerInfo,
        paymentSource: {
          creditCardInfo: {
            creditCard
          }
        }
      })
    }
  );

  if (response.status > 299 || response.status < 200) {
    console.log(response);

    if (response.status === 400) {
      const error = await response.json();
      console.log(error);
      throw new CardError(error);
    }

    throw response;
  }

  response = await response.json();

  const { subscriptionId, status } = response;

  return {
    subscription: {
      ...getSubscriptionData(response),
      expiry: null,
      hasExpired: false
    },
    data: {
      subscriptionId,
      planId,
      status,
      paymentMethod: 'blueSnap'
    }
  };
};

module.exports.getSubscription = async ({
  subscriptionId,
  subscribedAt,
  expiry = null
}) => {
  let response = await fetch(
    `https://sandbox.bluesnap.com/services/2/recurring/subscriptions/${subscriptionId}`,
    { headers }
  );

  if (response.status > 299 || response.status < 200) {
    console.log(response);
    const error = await response.json();
    console.log(error);
    throw error;
  }

  response = await response.json();
  const subscription = getSubscriptionData(response);

  return {
    ...subscription,
    expiry,
    hasExpired: expiry ? isPast(expiry) : false,
    subscribedAt
  };
};

module.exports.cancelSubscription = async ({
  subscription,
  currentSubscriptionData
}) => {
  const status = 'CANCELED';
  const { nextChargeDate } = currentSubscriptionData;
  const { subscriptionId, planId } = subscription;

  const response = await fetch(
    `https://sandbox.bluesnap.com/services/2/recurring/subscriptions/${subscriptionId}`,
    {
      headers,
      method: 'put',
      body: JSON.stringify({
        planId,
        status
      })
    }
  );

  if (response.status > 299 || response.status < 200) {
    console.log(response);
    const error = await response.json();
    console.log(error);
    throw error;
  }

  const data = {
    subscriptionId,
    planId,
    status,
    paymentMethod: 'blueSnap',
    expiry: new Date(nextChargeDate).toISOString()
  };

  const {
    cardLastFourDigits,
    cardType,
    cardSubType,
    expirationMonth,
    expirationYear
  } = currentSubscriptionData;

  return {
    data,
    subscription: {
      ...data,
      cardLastFourDigits,
      cardType,
      cardSubType,
      expirationMonth,
      expirationYear,
      isActive: false
    }
  };
};
