const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);
const Order = require('../../../models/order');
const stripeCommon = require('./common');
const nodemailer = require('../../../utils/nodemailer');

const emailBodyTemplate = `Dear Customer,

Thank you for your order for renting the following DVD's. They will be reserved and available at our store for pickup over the next 2 weeks. 
{cartItems}

Please feel free to contact our helpdesk on 222-333-444 for any queries. 

Thank you, 
Team Ultra.`;

router.post('/create-payment-intent', async (req, res) => {
  const { titlesRented } = req.body;
  const { userEmail } = req;
  let savedPaymentCustomer = '';
  let orderInfo;

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
    orderInfo = await stripeCommon.createOrder(userEmail, titlesRented);
  } catch (error) {
    return res.status(500).json({
      message: 'Create Order failed : ' + error.message,
    });
  }

  try {
    const subscriptionInfo = await stripeCommon.getActiveSubscriptionInfo(
      savedPaymentCustomer
    );
    if (subscriptionInfo.lookupKey) {
      return res.send({
        orderId: orderInfo.id,
        subscriptionActive: true,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: 'Retrieving User Subscriptions failed : ' + error.message,
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
    orderInfo = await stripeCommon.createOrder(userEmail, titlesRented);
  } catch (error) {
    return res.status(500).json({
      message: 'Create Order failed : ' + error.message,
    });
  }

  try {
    const subscriptionInfo = await stripeCommon.getActiveSubscriptionInfo(
      savedPaymentCustomer
    );
    if (subscriptionInfo.lookupKey) {
      // if subscription is active, don't charge the customer
      return res.json({
        url: `${redirectFromCheckoutURLSuccessNoCheckout}?orderId=${orderInfo.id}`,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: 'Retrieving User Subscriptions failed : ' + error.message,
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
      client_reference_id: orderInfo.orderNo,
      customer: savedPaymentCustomer.paymentCustomerIdStripe,
    });
    res.json({ stripeURL: session.url });
  } catch (error) {
    return res.status(500).json({
      message: 'Create Checkout Session failed : ' + error.message,
    });
  }
});

router.post('/complete-payment', async (req, res) => {
  const { orderId } = req.body;
  let order;
  let orderNo;

  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    return res.status(500).json({
      message: 'Complete Payment failed : ' + 'valid orderId must be defined.',
    });
  }

  try {
    order = await Order.findByIdAndUpdate(orderId, {
      status: 'Payment Confirmed',
    }).exec();
    if (!order) {
      return res.status(500).json({
        message:
          'Complete Payment failed : ' + 'orderId not found in database.',
      });
    }

    orderNo = order.orderNo;
  } catch (error) {
    return res.status(500).json({
      message: 'Complete Payment failed : ' + error.message,
    });
  }

  try {
    const subject = `Ultra Movie Shop - Order #${orderNo} placed successfully`;
    const emailBody = emailBodyTemplate.replace(
      '{cartItems}',
      `<ul>${order.cartItems.map((item) => `<li>${item}</li>`)}</ul>`
    );
    await nodemailer.sendEmail(order.email, emailBody, subject);
  } catch (error) {
    return res.status(500).json({
      message: 'Send Email failed : ' + error.message,
    });
  }

  res.send({
    orderNo,
  });
});

module.exports = router;
