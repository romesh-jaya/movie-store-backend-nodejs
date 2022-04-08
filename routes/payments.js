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

router.post('/create-payment-customer', async (req, res) => {
  const { userEmail } = req.body;

  try {
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
      res.status(200).json('Payment Customer created: ' + customer.id);
    } else {
      res
        .status(200)
        .json(
          'Payment Customer already exists: ' +
            savedPaymentCustomer.paymentCustomerIdStripe
        );
    }
  } catch (error) {
    return res.status(500).json({
      message: 'Create Payment Customer failed : ' + error.message,
    });
  }
});

router.post('/create-payment-intent', async (req, res) => {
  const { titlesRented, userEmail } = req.body;

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

  const savedPaymentCustomer = await PaymentCustomer.findOne({
    email: userEmail,
  }).exec();
  if (!savedPaymentCustomer) {
    return res.status(500).json({
      message:
        "Create Payment Intent failed : PaymentCustomer doesn't exist in the database",
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

module.exports = router;
