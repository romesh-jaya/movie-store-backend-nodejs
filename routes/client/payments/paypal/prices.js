const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const constants = require('../../../../constants');
const paypalCommon = require('./common');
const subscriptionPlansURL = process.env.PAYPAL_GET_PLANS_URL;

router.get('/', async (req, res) => {
  const { userEmail } = req;
  let accessToken;
  let subscriptionPlans;
  let subscriptionInfo;

  try {
    accessToken = await paypalCommon.generateAccessToken();
  } catch (err) {
    const errorConstructEvent = 'Paypal Webhook Error in generateAccessToken: ';
    console.error(errorConstructEvent, err.message);
    return res.status(400).send(`${errorConstructEvent} ${err.message}`);
  }

  try {
    // get subscription prices
    const response = await fetch(subscriptionPlansURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'return=representation',
      },
    });
    const responseJson = await response.json();
    if (!(responseJson.plans && responseJson.plans.length > 0)) {
      const errorConstructEvent = 'Paypal extracting subscription plans failed';
      console.error(errorConstructEvent);
      return res.status(400).send(errorConstructEvent);
    }

    subscriptionPlans = responseJson.plans;
  } catch (err) {
    const errorConstructEvent = 'Paypal Error in fetching subscription plans: ';
    console.error(errorConstructEvent, err.message);
    return res.status(400).send(`${errorConstructEvent} ${err.message}`);
  }

  try {
    subscriptionInfo = await paypalCommon.getActiveSubscriptionInfo(userEmail);
  } catch (error) {
    return res.status(500).json({
      message: 'Retrieving User Subscriptions failed : ' + error.message,
    });
  }

  let priceInfo = [];
  priceInfo.push({
    lookupKey: constants.titlePriceId,
    price: subscriptionInfo.lookupKey ? 0 : 2, // Paypal has no facility to store the product prices. Hence hardcoding this value
    currency: 'USD',
  });

  subscriptionPlans.forEach((plan) => {
    if (
      plan.billing_cycles.length > 0 &&
      plan.billing_cycles[0].pricing_scheme &&
      plan.billing_cycles[0].pricing_scheme.fixed_price
    ) {
      priceInfo.push({
        lookupKey: plan.name,
        price: parseFloat(
          plan.billing_cycles[0].pricing_scheme.fixed_price.value
        ),
        currency:
          plan.billing_cycles[0].pricing_scheme.fixed_price.currency_code,
        planIDPayPal: plan.id,
      });
    }
  });

  res.send({ priceInfo });
});

module.exports = router;
