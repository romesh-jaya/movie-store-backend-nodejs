const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);
const stripeCommon = require('./common');
const paymentsCommon = require('../paymentsCommon');
const orderUtil = require('../../../../utils/order');
const paymentMethod = 'STRIPE';

router.post('/create-payment-intent', async (req, res) => {
  const { titlesRented } = req.body;
  const { userEmail } = req;
  let savedPaymentCustomer = '';
  let orderInfo;
  let subscriptionInfo;

  if (
    !titlesRented ||
    !Array.isArray(titlesRented) ||
    titlesRented.length === 0
  ) {
    return res.status(500).json({
      message:
        'Create Payment Intent failed : ' +
        'titlesRented must be a valid array with length greater than zero.',
    });
  }

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
    orderInfo = await paymentsCommon.createOrder(
      userEmail,
      titlesRented,
      !!subscriptionInfo.lookupKey,
      paymentMethod
    );
  } catch (error) {
    return res.status(500).json({
      message: 'Create Order failed : ' + error.message,
    });
  }

  if (subscriptionInfo.lookupKey) {
    await orderUtil.sendEmailOrderCompletion(orderInfo);

    // if subscription is active, don't charge the customer
    return res.send({
      orderId: orderInfo.id,
      subscriptionActive: true,
    });
  }

  try {
    const titlePrice = await stripeCommon.getTitlePrice();
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      customer: savedPaymentCustomer.paymentCustomerIdStripe,
      amount: titlePrice.unit_amount * titlesRented.length,
      currency: titlePrice.currency,
      payment_method_types: ['card'],
      setup_future_usage: 'on_session',
      description: orderInfo.orderNo, // This field is used later on in the Order Completion step
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
      orderId: orderInfo.id,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Create Payment Intent failed : ' + error.message,
    });
  }
});

router.post('/create-checkout-session', async (req, res) => {
  const {
    titlesRented,
    redirectFromCheckoutURLCancelled,
    redirectFromCheckoutURLSuccess,
    redirectFromCheckoutURLSuccessNoCheckout,
  } = req.body;
  const { userEmail } = req;
  const priceId = process.env.DVD_RENT_PRICE_ID;
  let savedPaymentCustomer = '';
  let orderInfo;
  let subscriptionInfo;

  //  ------------ Validations, start ------------------------
  if (!priceId) {
    return res.status(500).json({
      message:
        'Create Checkout Session failed : ' +
        'DVD_RENT_PRICE_ID and FE_URL must be defined.',
    });
  }

  if (
    !titlesRented ||
    !Array.isArray(titlesRented) ||
    titlesRented.length === 0
  ) {
    return res.status(500).json({
      message:
        'Create Checkout Session failed : ' +
        'titlesRented must be a valid array with length greater than zero.',
    });
  }

  if (
    !redirectFromCheckoutURLSuccess ||
    !redirectFromCheckoutURLCancelled ||
    !redirectFromCheckoutURLSuccessNoCheckout
  ) {
    return res.status(500).json({
      message:
        'Create Checkout Session failed : ' +
        'redirectFromCheckoutURLCancelled, redirectFromCheckoutURLSuccessNoCheckout and redirectFromCheckoutURLSuccess must be defined.',
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

  try {
    orderInfo = await paymentsCommon.createOrder(
      userEmail,
      titlesRented,
      !!subscriptionInfo.lookupKey,
      paymentMethod
    );
  } catch (error) {
    return res.status(500).json({
      message: 'Create Order failed : ' + error.message,
    });
  }

  if (subscriptionInfo.lookupKey) {
    await orderUtil.sendEmailOrderCompletion(orderInfo);

    // if subscription is active, don't charge the customer
    return res.json({
      url: `${redirectFromCheckoutURLSuccessNoCheckout}?orderId=${orderInfo.id}`,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: process.env.DVD_RENT_PRICE_ID,
          quantity: titlesRented.length,
        },
      ],
      mode: 'payment',
      success_url: `${redirectFromCheckoutURLSuccess}?orderId=${orderInfo.id}`,
      cancel_url: `${redirectFromCheckoutURLCancelled}`,
      client_reference_id: orderInfo.orderNo, // This field is used later on in the Order Completion step
      customer: savedPaymentCustomer.paymentCustomerIdStripe,
    });
    res.json({ stripeURL: session.url });
  } catch (error) {
    return res.status(500).json({
      message: 'Create Checkout Session failed : ' + error.message,
    });
  }
});

module.exports = router;
