const express = require('express');
const router = express.Router();

const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);

const calculateOrderAmount = (noOfTitlesRented) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  return noOfTitlesRented * 2 * 100;
};

router.post('/create-payment-intent', async (req, res) => {
  const { noOfTitlesRented } = req.body;

  if (!noOfTitlesRented || isNaN(noOfTitlesRented)) {
    return res.status(500).json({
      message:
        'Create Payment Intent failed : ' +
        'noOfTitlesRented must be a valid number greater than zero.',
    });
  }

  try {
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: calculateOrderAmount(noOfTitlesRented),
      currency: 'eur',
      payment_method_types: ['card'],
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
