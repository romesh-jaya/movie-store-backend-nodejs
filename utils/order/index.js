const Order = require('../../models/order');
const nodemailer = require('../../utils/nodemailer');
const constants = require('../../constants');
const mongoose = require('mongoose');

const completeOrderAndSendEmail = async (orderId) => {
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
    const emailBody = constants.emailBodyTemplate.replace(
      '{cartItems}',
      `<ul>${order.cartItems.map((item) => `<li>${item}</li>`)}</ul>`
    );
    await nodemailer.sendEmail(order.email, emailBody, subject);
  } catch (error) {
    return res.status(500).json({
      message: 'Send Email failed : ' + error.message,
    });
  }

  response.status(200);
};

module.exports = {
  completeOrderAndSendEmail,
};
