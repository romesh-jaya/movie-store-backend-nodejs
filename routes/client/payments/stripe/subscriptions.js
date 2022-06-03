const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);
const stripeCommon = require('./common');

router.post('/create-checkout-session-subscription', async (req, res) => {
  const {
    lookup_key,
    redirectFromCheckoutURLSuccess,
    redirectFromCheckoutURLCancelled,
  } = req.body;
  const { userEmail } = req;
  let savedPaymentCustomer = '';
  let subscriptionInfo = {};

  //  ------------ Validations, start ------------------------
  if (
    !lookup_key ||
    !redirectFromCheckoutURLSuccess ||
    !redirectFromCheckoutURLCancelled
  ) {
    return res.status(500).json({
      message:
        'Create Checkout Session failed : ' +
        'lookup_key, redirectFromCheckoutURLSuccess and redirectFromCheckoutURLCancelled must be defined.',
    });
  }

  const pricesFromStripe = await stripe.prices.list({
    lookup_keys: [lookup_key],
    expand: ['data.product'],
  });

  if (
    !pricesFromStripe ||
    !pricesFromStripe.data ||
    pricesFromStripe.data.length === 0
  ) {
    return res.status(500).json({
      message:
        'Create Checkout Session failed : ' +
        'no matching price found for lookup key provided.',
    });
  }
  //  ------------ Validations, end ------------------------

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

  if (subscriptionInfo.lookupKey) {
    return res.status(500).json({
      message: 'Active subscription already exists for customer.',
    });
  }

  const session = await stripe.checkout.sessions.create({
    billing_address_collection: 'auto',
    line_items: [
      {
        price: pricesFromStripe.data[0].id,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    customer: savedPaymentCustomer.paymentCustomerIdStripe,
    success_url: `${redirectFromCheckoutURLSuccess}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${redirectFromCheckoutURLCancelled}`,
  });

  res.json({ url: session.url });
});

// get only the first subscription, since we don't expect multiple subscriptions for a single
// customer to be possible
router.get('/get-user-subscription', async (req, res) => {
  const { userEmail } = req;
  let savedPaymentCustomer = '';

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
    const subscriptionInfo = await stripeCommon.getActiveSubscriptionInfo(
      savedPaymentCustomer
    );
    if (subscriptionInfo.lookupKey) {
      return res.json({
        lookupKey: subscriptionInfo.lookupKey,
        cancelAtDate: subscriptionInfo.cancelAtDate,
        currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
      });
    }
    return res.json({});
  } catch (error) {
    return res.status(500).json({
      message: 'Retrieving User Subscriptions failed : ' + error.message,
    });
  }
});

module.exports = router;
