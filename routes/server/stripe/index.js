const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);
// Find the STRIPE_ENDPOINT_SECRET in your Stripe Dashboard's webhook settings
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
const orderUtil = require('../../../utils/order');

router.post(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (request, response) => {
    const payload = request.body;
    const sig = request.headers['stripe-signature'];
    let event;

    console.log('payload', payload);

    if (!endpointSecret) {
      const errorParams =
        'Stripe Webhook Error: endpointSecret was found to be empty';
      console.error(errorParams);
      return response.status(400).send(errorParams);
    }

    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
      const errorConstructEvent = 'Stripe Webhook Error in constructEvent: ';
      console.error(errorConstructEvent, err.message);
      return response.status(400).send(`${errorConstructEvent} ${err.message}`);
    }

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'payment_intent.succeeded'
    ) {
      const session = event.data.object;
      let orderNo;

      // if prebuilt checkout session was used
      if (event.type === 'checkout.session.completed') {
        if (!session || !session.client_reference_id) {
          const errorParams =
            'Stripe Webhook Error: Session or client_reference_id was found to be empty. This error can be ignored if prebuilt checkout session was used to apply for subscription.';
          console.error(errorParams);
          return response.status(400).send(errorParams);
        }

        orderNo = session.client_reference_id;
      } else if (event.type === 'payment_intent.succeeded') {
        // if react-stripe library was used

        if (!session || !session.description || isNaN(session.description)) {
          // Note: even the prebuilt checkout session will fire this event, but with null for description
          // In this case, the following error will be fired, but it is not a problem.
          const errorParams =
            'Stripe Webhook Error: Session or description was found to be empty or invalid. This error can be ignored if prebuilt checkout session was used';
          console.error(errorParams);
          return response.status(400).send(errorParams);
        }
        orderNo = session.description;
      }
      try {
        await orderUtil.completeOrderAndSendEmail(orderNo);
      } catch (err) {
        const errorEmail = 'Stripe Webhook Send email error: ';
        console.error(errorEmail, err.message);
        return response.status(400).send(`${errorEmail} ${err.message}`);
      }
    }

    response.status(200);
  }
);

module.exports = router;
