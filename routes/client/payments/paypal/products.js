const express = require('express');
const router = express.Router();
const orderUtil = require('../../../../utils/order');
const paymentsCommon = require('../paymentsCommon');
const paypalCommon = require('./common');
const paymentMethod = 'PAYPAL';

router.post('/create-payment-intent', async (req, res) => {
  const { titlesRented } = req.body;
  const { userEmail } = req;
  let orderInfo;
  let subscriptionInfo;

  try {
    subscriptionInfo = await paypalCommon.getActiveSubscriptionInfo(userEmail);
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
  res.send({
    orderId: orderInfo.id,
  });
});

module.exports = router;
