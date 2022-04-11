const express = require('express');
const router = express.Router();
const PaymentCustomer = require('../models/paymentCustomer');

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

router.post('/create-payment-intent', async (req, res) => {
  const { titlesRented } = req.body;
  const { userEmail } = req;
  let savedPaymentCustomer = '';

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

router.post('/create-checkout-session', async (req, res) => {
  const { titlesRented } = req.body;
  const { userEmail } = req;
  const priceId = process.env.DVD_RENT_PRICE_ID;
  const feURL = process.env.FE_URL;
  let savedPaymentCustomer = '';

  if (!priceId || !feURL) {
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

  try {
    savedPaymentCustomer = await getOrCreatePaymentCustomer(userEmail);
  } catch (error) {
    return res.status(500).json({
      message: 'Create Payment Customer failed : ' + error.message,
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
      success_url: `${feURL}?success=true`,
      cancel_url: `${feURL}?canceled=true`,
      metadata: { cartItems: JSON.stringify(titlesRented) },
      customer: savedPaymentCustomer.paymentCustomerIdStripe,
    });
    // res.redirect(303, session.url);
    res.json({ url: session.url });
  } catch (error) {
    return res.status(500).json({
      message: 'Create Checkout Session failed : ' + error.message,
    });
  }
});

module.exports = router;
