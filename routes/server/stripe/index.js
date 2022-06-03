const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);
// Find your endpoint's secret in your Dashboard's webhook settings
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
const orderUtil = require('../../../utils/order');

router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (request, response) => {
    const payload = request.body;
    const sig = request.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
      console.error('Stripe webhook error', err.message);
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      if (!session || !session.client_reference_id) {
        return response
          .status(400)
          .send(
            `Webhook Error: Session or client_reference_id was found to be empty`
          );
      }
      try {
        await orderUtil.completeOrderAndSendEmail(session.client_reference_id);
      } catch (err) {
        console.error('Send email error', err);
        return response.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    response.status(200);
  }
);

module.exports = router;
