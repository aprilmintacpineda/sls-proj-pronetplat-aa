const fetch = require('node-fetch');

const username = 'API_1602153518351925061784';
const password = '%7d#W6WcpJ6A';

const auth = Buffer.from(`${username}:${password}`).toString(
  'base64'
);
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

  if (response.plans)
    plan = response.plans.find(({ name }) => name === planName);

  if (!plan) {
    response = await fetch(
      'https://sandbox.bluesnap.com/services/2/recurring/plans',
      {
        method: 'post',
        headers,
        body: JSON.stringify({
          chargeFrequency: 'MONTHLY',
          gracePeriodDays: 5,
          name: planName,
          currency: 'USD',
          recurringChargeAmount: amount
        })
      }
    );

    plan = await response.json();
    console.log('createdPlan');
  }

  console.log(JSON.stringify(plan, null, 2));

  return plan;
}

(async () => {
  await createPlan();
})();
