const express = require('express');
const router = express.Router();
const constants = require('../../../../constants');
const stripeCommon = require('./common');
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);

router.get('/', async (req, res) => {
  const { userEmail } = req;
  let savedPaymentCustomer = '';
  let subscriptionInfo;

  try {
    savedPaymentCustomer = await stripeCommon.getOrCreatePaymentCustomer(
      userEmail
    );
  } catch (error) {
    return res.status(500).json({
      message: 'Create Payment Customer failed : ' + error.message,
    });
  }

  try {
    subscriptionInfo = await stripeCommon.getActiveSubscriptionInfo(
      savedPaymentCustomer
    );
  } catch (error) {
    return res.status(500).json({
      message: 'Retrieving User Subscriptions failed : ' + error.message,
    });
  }

  try {
    // Both product and subscription prices are returned via this call
    const prices = await stripe.prices.list({ active: true });
    const priceInfo = prices.data.map((price) => {
      let lookupKey = '';
      // Note: only subscription prices can be created with a lookup key.
      // Product prices can be referenced via id
      if (price.id === process.env.STRIPE_DVD_RENT_PRICE_ID) {
        lookupKey = constants.titlePriceId;
      } else {
        lookupKey = price.lookup_key;
      }
      return {
        lookupKey,
        price: subscriptionInfo.lookupKey ? 0 : price.unit_amount / 100, // convert from cents to actual main currency
        currency: price.currency,
      };
    });
    res.send({ priceInfo });
  } catch (error) {
    return res.status(500).json({
      message: 'Obtaining price failed : ' + error.message,
    });
  }
});

module.exports = router;
