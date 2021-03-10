const fetch = require('node-fetch');

const paypalClientId =
  'ATiEi2DXkE8UWWszfWkYztmt-OmALa7qx5-N_T61Wn_v0QrDwRG_7Z259tzIkTk7hhevZcH4TgJyseXf';
const paypalSecret =
  'EA-xQkJiyPoUXkm0GJhe1Owt2tcI927riTQIPZwjEczB8TANj3TIfUsR61dXX4Zv9kH2cEuE4d2LH2mU';

const auth = Buffer.from(
  `${paypalClientId}:${paypalSecret}`
).toString('base64');
const headers = {
  Authorization: `Basic ${auth}`,
  'Content-Type': 'application/json'
};

async function createProduct () {
  let product = null;
  let response = await fetch(
    'https://api.sandbox.paypal.com/v1/catalogs/products',
    {
      headers
    }
  );
  response = await response.json();

  try {
    product = response.products.reverse()[0];
  } catch (error) {
    console.log('createProduct', product);
  }

  if (product) {
    response = await fetch(
      `https://api.sandbox.paypal.com/v1/catalogs/products/${product.id}`,
      { headers }
    );

    product = await response.json();
  } else {
    response = await fetch(
      'https://api.sandbox.paypal.com/v1/catalogs/products',
      {
        method: 'post',
        headers,
        body: JSON.stringify({
          name: 'Entrepic',
          description:
            'Entrepic - a professional networking platform for professionals, business people, and entrepreneurs to grow.',
          type: 'SERVICE',
          category: 'SOFTWARE',
          image_url:
            'https://ui-avatars.com/api/?name=Entrepic&rounded=true&size=150',
          home_url: 'https://entrepic.com/'
        })
      }
    );

    product = await response.json();
    console.log('createProduct product created');
  }

  console.log('createProduct', product);
  return product;
}

async function createPlan () {
  const product = await createProduct();
  let plan = null;
  let response = null;

  response = await fetch(
    `https://api.sandbox.paypal.com/v1/billing/plans?product_id=${product.id}`,
    { headers }
  );
  response = await response.json();

  try {
    plan = response.plans.reverse()[0];
  } catch (error) {
    console.log('createPlan', error);
  }

  if (plan) {
    response = await fetch(
      `https://api.sandbox.paypal.com/v1/billing/plans/${plan.id}`,
      {
        headers
      }
    );

    plan = await response.json();
  } else {
    response = await fetch(
      'https://api.sandbox.paypal.com/v1/billing/plans',
      {
        method: 'post',
        headers,
        body: JSON.stringify({
          product_id: product.id,
          name: 'Entrepic monthly plan',
          description: 'Monthly payment plan for Entrepic',
          billing_cycles: [
            {
              tenure_type: 'REGULAR',
              sequence: 1,
              pricing_scheme: {
                fixed_price: {
                  value: 3,
                  currency_code: 'USD'
                }
              },
              frequency: {
                interval_unit: 'MONTH',
                interval_count: 1
              }
            }
          ],
          payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee_failure_action: 'CONTINUE',
            payment_failure_threshold: 3
          }
        })
      }
    );

    plan = await response.json();
    console.log('createPlan plan created');
  }

  console.log('createPlan', plan);
  return plan;
}

async function createSubscription (planId) {
  let response = await fetch(
    'https://api.sandbox.paypal.com/v1/billing/subscriptions',
    {
      method: 'post',
      headers,
      body: JSON.stringify({
        plan_id: planId,
        quantity: 1,
        subscriber: {
          name: {
            given_name: 'John',
            surname: 'Doe'
          },
          email_address: 'april@moretonblue.com'
        },
        application_context: {
          brand_name: 'Entrepic',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          },
          return_url: 'https://entrepic.com/return-url',
          cancel_url: 'https://entrepic.com/cancel-url'
        }
      })
    }
  );

  response = await response.json();

  console.log('createSubscription', response);
}

(async () => {
  const plan = await createPlan();
  await createSubscription(plan.id);
})();
