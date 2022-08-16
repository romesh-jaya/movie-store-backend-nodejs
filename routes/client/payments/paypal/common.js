const fetch = require('node-fetch');
const clientID = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const authURL = process.env.PAYPAL_AUTH_URL;
const subscriptionInfoURL = process.env.PAYPAL_GET_SUBSCRIPTION_INFO_URL;
const subscriptionPlansURL = process.env.PAYPAL_GET_PLANS_URL;
const PayPalSubscription = require('../../../../models/payPalSubscription');

// Access token is used to authenticate all REST API requests
// Taken from https://developer.paypal.com/docs/checkout/advanced/integrate/#link-generateclienttoken
async function generateAccessToken() {
  if (!clientID || !clientSecret || !authURL) {
    const errorParams =
      'generateAccessToken(): clientID, authURL or clientSecret was found to be empty';
    throw new Error(errorParams);
  }

  const auth = Buffer.from(clientID + ':' + clientSecret).toString('base64');

  const response = await fetch(authURL, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  const data = await response.json();
  return data.access_token;
}

const getActiveSubscriptionInfo = async (userEmail) => {
  let currentPeriodEnd;
  let subscriptionPlanID;

  if (!subscriptionInfoURL || !subscriptionPlansURL) {
    const errorParams =
      'getActiveSubscriptionInfo(): subscriptionInfoURL or subscriptionPlansURL was found to be empty';
    throw new Error(errorParams);
  }

  const payPalSubscription = await PayPalSubscription.findOne({
    email: userEmail,
  }).exec();

  if (payPalSubscription) {
    try {
      accessToken = await generateAccessToken();
    } catch (err) {
      const errorConstructEvent =
        'Paypal Webhook Error in generateAccessToken: ';
      console.error(errorConstructEvent, err.message);
      return res.status(400).send(`${errorConstructEvent} ${err.message}`);
    }

    try {
      // get subscription prices
      const response = await fetch(
        `${subscriptionInfoURL}/${payPalSubscription.subscriptionID}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const responseJson = await response.json();
      if (
        !(
          responseJson &&
          responseJson.status === 'ACTIVE' &&
          responseJson.billing_info &&
          responseJson.billing_info.next_billing_time &&
          responseJson.plan_id
        )
      ) {
        return {};
      }

      currentPeriodEnd = new Date(responseJson.billing_info.next_billing_time);
      subscriptionPlanID = responseJson.plan_id;
    } catch (err) {
      const errorConstructEvent =
        'Paypal Error in fetching subscription plans: ';
      console.error(errorConstructEvent, err.message);
      return res.status(400).send(`${errorConstructEvent} ${err.message}`);
    }

    try {
      // get subscription prices
      const response = await fetch(
        `${subscriptionPlansURL}/${subscriptionPlanID}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'return=representation',
          },
        }
      );
      const responseJson = await response.json();
      if (!(responseJson && responseJson.name)) {
        const errorConstructEvent =
          'Paypal extracting subscription plan failed';
        console.error(errorConstructEvent);
        return res.status(400).send(errorConstructEvent);
      }

      return { lookupKey: responseJson.name, currentPeriodEnd };
    } catch (err) {
      const errorConstructEvent =
        'Paypal Error in fetching subscription plans: ';
      console.error(errorConstructEvent, err.message);
      return res.status(400).send(`${errorConstructEvent} ${err.message}`);
    }
  }
  return {};
};

module.exports = {
  generateAccessToken,
  getActiveSubscriptionInfo,
};
