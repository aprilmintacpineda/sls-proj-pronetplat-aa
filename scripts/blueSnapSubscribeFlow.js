const fetch = require('node-fetch');

const username = 'API_1602153518351925061784';
const password = '$SPc!p18O@d0';

const auth = Buffer.from(`${username}:${password}`).toString('base64');
const headers = {
  Authorization: `Basic ${auth}`,
  'Content-Type': 'application/json'
};

async function createPlan () {
  const amount = 3;
  const planName = 'Regular Plan';

  let response = null;
  let plan = null;

  response = await fetch(
    'https://sandbox.bluesnap.com/services/2/recurring/plans?status=active',
    { headers }
  );

  response = await response.json();

  if (response.plans) plan = response.plans.find(({ name }) => name === planName);

  if (!plan) {
    response = await fetch('https://sandbox.bluesnap.com/services/2/recurring/plans', {
      method: 'post',
      headers,
      body: JSON.stringify({
        chargeFrequency: 'MONTHLY',
        gracePeriodDays: 5,
        name: planName,
        currency: 'USD',
        recurringChargeAmount: amount
      })
    });

    plan = await response.json();
    console.log('createdPlan');
  }

  console.log(JSON.stringify(plan, null, 2));

  return plan;
}

async function createSubscription (planId) {
  const testCard = {
    expirationYear: 2023,
    expirationMonth: '02',
    securityCode: 123,
    cardNumber: '3566000020000410'
  };

  let response = await fetch(
    'https://sandbox.bluesnap.com/services/2/recurring/subscriptions',
    {
      method: 'post',
      headers,
      body: JSON.stringify({
        planId,
        authorizedByShopper: true,
        payerInfo: {
          email: 'april@moretonblue.com',
          firstName: 'John',
          lastName: 'Doe'
        },
        paymentSource: {
          creditCardInfo: {
            creditCard: testCard
          }
        }
      })
    }
  );

  response = await response.json();

  console.log(JSON.stringify(response, null, 2));

  return response;
}

(async () => {
  const { planId } = await createPlan();
  createSubscription(planId);
})();