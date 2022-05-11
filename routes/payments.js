const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const PaymentCustomer = require('../models/paymentCustomer');
const Order = require('../models/order');

const stripe = require('stripe')(process.env.STRIPE_TEST_SECRET_KEY);

const getTitlePrice = async () => {
  return await stripe.prices.retrieve(process.env.DVD_RENT_PRICE_ID);
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
    return paymentCustomer;
  }
  return savedPaymentCustomer;
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
    orderInfo = await createOrder(userEmail, titlesRented);
  } catch (error) {
    return res.status(500).json({
      message: 'Create Order failed : ' + error.message,
    });
  }

  try {
    const titlePrice = await getTitlePrice();
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

router.get('/title-price', async (_, res) => {
  try {
    const price = await getTitlePrice();
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

router.post('/create-checkout-session-subscription', async (req, res) => {
  const {
    lookup_key,
    redirectFromCheckoutURLSuccess,
    redirectFromCheckoutURLCancelled,
  } = req.body;
  const { userEmail } = req;
  let savedPaymentCustomer = '';

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
    savedPaymentCustomer = await getOrCreatePaymentCustomer(userEmail);
  } catch (error) {
    return res.status(500).json({
      message: 'Create Payment Customer failed : ' + error.message,
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

router.get('/list-subscriptions', async (req, res) => {
  const { userEmail } = req;
  let savedPaymentCustomer = '';

  try {
    savedPaymentCustomer = await getOrCreatePaymentCustomer(userEmail);
  } catch (error) {
    return res.status(500).json({
      message: 'Create Payment Customer failed : ' + error.message,
    });
  }

  // get only the first subscription, since we don't expect multiple subscriptions for a single
  // customer to be possible
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: savedPaymentCustomer.paymentCustomerIdStripe,
    });

    if (subscriptions && subscriptions.data && subscriptions.data.length > 0) {
      const subscriptionData = subscriptions.data[0];
      if (
        subscriptionData.items &&
        subscriptionData.items.data &&
        subscriptionData.items.data.length > 0
      ) {
        const priceItem = subscriptionData.items.data[0].price.lookup_key;
        return res.json({ lookupKey: priceItem });
      }
    }

    res.json({ lookupKey: null });
  } catch (error) {
    return res.status(500).json({
      message: 'Listing Subscriptions failed : ' + error.message,
    });
  }
});

module.exports = router;
