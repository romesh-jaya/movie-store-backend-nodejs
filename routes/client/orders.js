const express = require('express');
const router = express.Router();
const Order = require('../../models/order');
const mongoose = require('mongoose');

router.get('/get-order-no', async (req, res) => {
  const { orderId } = req.query;
  let order;

  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    return res.status(500).json({
      message: 'Fetching order failed : ' + 'valid orderId must be defined.',
    });
  }

  try {
    order = await Order.findById(orderId).exec();
  } catch (error) {
    return res.status(500).json({
      message: 'Fetching order failed: ' + error.message,
    });
  }

  res.status(200).json(order.orderNo);
});

module.exports = router;
