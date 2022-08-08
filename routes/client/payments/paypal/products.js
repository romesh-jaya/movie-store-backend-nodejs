const express = require('express');
const router = express.Router();
const paymentsCommon = require('../paymentsCommon');
const paymentMethod = 'PAYPAL';

router.post('/create-payment-intent', async (req, res) => {
  const { titlesRented } = req.body;
  const { userEmail } = req;
  let orderInfo;

  try {
    orderInfo = await paymentsCommon.createOrder(
      userEmail,
      titlesRented,
      false,
      paymentMethod
    );
    res.send({
      orderId: orderInfo.id,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Create Order failed : ' + error.message,
    });
  }
});

module.exports = router;
