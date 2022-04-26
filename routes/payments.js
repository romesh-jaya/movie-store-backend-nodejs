const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const PaymentCustomer = require('../models/paymentCustomer');
const Order = require('../models/order');

const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);

const calculateOrderAmount = (noOfTitlesRented) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  return noOfTitlesRented * 2 * 100;
};

const getOrCreatePaymentCustomer = async (userEmail) => {
  const savedPaymentCustomer = await PaymentCustomer.findOne({
    email: userEmail,
  }).exec();
  if (!savedPaymentCustomer) {
    const customer = await stripe.customers.create({
      description: userEmail,
    });
    const paymentCustomer = new PaymentCustomer({
      email: userEmail,
      paymentCustomerIdStripe: customer.id,
    });
    await paymentCustomer.save();
    return customer.id;
  }
  return savedPaymentCustomer.paymentCustomerIdStripe;
};

const createOrder = async (userEmail, cartItems) => {
  const order = new Order({
    email: userEmail,
    cartItems,
    created: new Date(),
    status: 'Payment Initiated',
  });
  const orderDoc = await order.save();
  return { orderNo: orderDoc.orderNo, id: orderDoc._id };
};

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
    savedPaymentCustomer = await getOrCreatePaymentCustomer(userEmail);
  } catch (error) {
    return res.status(500).json({
      message: 'Create Payment Customer failed : ' + error.message,
    });
  }

  try {
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      customer: savedPaymentCustomer.paymentCustomerIdStripe,
      amount: calculateOrderAmount(titlesRented.length),
      currency: 'usd',
      payment_method_types: ['card'],
      setup_future_usage: 'on_session',
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Create Payment Intent failed : ' + error.message,
    });
  }
});

router.get('/title-price', async (_, res) => {
  try {
    const price = await stripe.prices.retrieve(process.env.DVD_RENT_PRICE_ID);
    res.send({
      price: price.unit_amount / 100, // convert from cents to actual main currency
      currency: price.currency,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Obtaining price failed : ' + error.message,
    });
  }
});

router.post('/create-checkout-session', async (req, res) => {
  const {
    titlesRented,
    redirectFromCheckoutURLCancelled,
    redirectFromCheckoutURLSuccess,
  } = req.body;
  const { userEmail } = req;
  const priceId = process.env.DVD_RENT_PRICE_ID;
  let savedPaymentCustomer = '';

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

  if (!redirectFromCheckoutURLSuccess || !redirectFromCheckoutURLCancelled) {
    return res.status(500).json({
      message:
        'Create Checkout Session failed : ' +
        'redirectFromCheckoutURLCancelled and redirectFromCheckoutURLSuccess must be defined.',
    });
  }
  //  ------------ Validations, end ------------------------

  try {
    savedPaymentCustomer = await getOrCreatePaymentCustomer(userEmail);
  } catch (error) {
    return res.status(500).json({
      message: 'Create Payment Customer failed : ' + error.message,
    });
  }

  try {
    orderInfo = await createOrder(userEmail, titlesRented);
  } catch (error) {
    return res.status(500).json({
      message: 'Create Order failed : ' + error.message,
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
    res.json({ url: session.url });
  } catch (error) {
    return res.status(500).json({
      message: 'Create Checkout Session failed : ' + error.message,
    });
  }
});

router.post('/complete-payment', async (req, res) => {
  const { orderId } = req.body;

  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    return res.status(500).json({
      message: 'Complete Payment failed : ' + 'valid orderId must be defined.',
    });
  }

  try {
    const order = await Order.findByIdAndUpdate(orderId, {
      status: 'Payment Confirmed',
    }).exec();
    if (!order) {
      return res.status(500).json({
        message:
          'Complete Payment failed : ' + 'orderId not found in database.',
      });
    }
    res.send({
      orderNo: order.orderNo,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Complete Payment failed : ' + error.message,
    });
  }
});

module.exports = router;
