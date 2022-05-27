const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);
const stripeCommon = require('./common');

// This returns a link to the customer portal where they can manage subscriptions
router.post('/create-customer-portal-session', async (req, res) => {
  const { redirectFromCheckoutURLCancelled } = req.body;
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

  const session = await stripe.billingPortal.sessions.create({
    customer: savedPaymentCustomer.paymentCustomerIdStripe,
    return_url: redirectFromCheckoutURLCancelled,
  });

  res.json({ url: session.url });
});

module.exports = router;
