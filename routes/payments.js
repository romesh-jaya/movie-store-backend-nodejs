const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const PaymentCustomer = require('../models/paymentCustomer');
const Order = require('../models/order');
const constants = require('../constants');

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

const getActiveSubscriptionInfo = async (savedPaymentCustomer) => {
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
      const lookupKey = subscriptionData.items.data[0].price.lookup_key;
      const cancelAtDate = subscriptionData.cancel_at
        ? new Date(subscriptionData.cancel_at * 1000)
        : null;
      const currentPeriodEnd = subscriptionData.current_period_end
        ? new Date(subscriptionData.current_period_end * 1000)
        : null;
      return { lookupKey, cancelAtDate, currentPeriodEnd };
    }
  }
  return {};
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
    const subscriptionInfo = await getActiveSubscriptionInfo(
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

router.get('/prices', async (req, res) => {
  const { userEmail } = req;
  let savedPaymentCustomer = '';
  let subscriptionInfo;

  try {
    savedPaymentCustomer = await getOrCreatePaymentCustomer(userEmail);
  } catch (error) {
    return res.status(500).json({
      message: 'Create Payment Customer failed : ' + error.message,
    });
  }

  try {
    subscriptionInfo = await getActiveSubscriptionInfo(savedPaymentCustomer);
  } catch (error) {
    return res.status(500).json({
      message: 'Retrieving User Subscriptions failed : ' + error.message,
    });
  }

  try {
    const prices = await stripe.prices.list({ active: true });
    const priceInfo = prices.data.map((price) => {
      let lookupKey = '';
      // Note: only subscription prices can be created with a lookup key.
      // Product prices can be referenced via id
      if (price.id === process.env.DVD_RENT_PRICE_ID) {
        lookupKey = constants.titlePriceId;
      } else {
        lookupKey = price.lookup_key;
      }
      return {
        lookupKey,
        price: subscriptionInfo.lookupKey ? 0 : price.unit_amount / 100, // convert from cents to actual main currency
        currency: price.currency,
      };
    });
    res.send({ priceInfo });
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
    const subscriptionInfo = await getActiveSubscriptionInfo(
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
  let subscriptionInfo = {};

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

  try {
    subscriptionInfo = await getActiveSubscriptionInfo(savedPaymentCustomer);
  } catch (error) {
    return res.status(500).json({
      message: 'Retrieving User Subscriptions failed : ' + error.message,
    });
  }

  if (subscriptionInfo.lookupKey) {
    return res.status(500).json({
      message: 'Active subscription already exists for customer.',
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

// get only the first subscription, since we don't expect multiple subscriptions for a single
// customer to be possible
router.get('/get-user-subscription', async (req, res) => {
  const { userEmail } = req;
  let savedPaymentCustomer = '';

  try {
    savedPaymentCustomer = await getOrCreatePaymentCustomer(userEmail);
  } catch (error) {
    return res.status(500).json({
      message: 'Create Payment Customer failed : ' + error.message,
    });
  }

  try {
    const subscriptionInfo = await getActiveSubscriptionInfo(
      savedPaymentCustomer
    );
    if (subscriptionInfo.lookupKey) {
      return res.json({
        lookupKey: subscriptionInfo.lookupKey,
        cancelAtDate: subscriptionInfo.cancelAtDate,
        currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
      });
    }
    return res.json({});
  } catch (error) {
    return res.status(500).json({
      message: 'Retrieving User Subscriptions failed : ' + error.message,
    });
  }
});

module.exports = router;
