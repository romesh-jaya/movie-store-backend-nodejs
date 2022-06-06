const Order = require('../../models/order');
const nodemailer = require('../../utils/nodemailer');
const constants = require('../../constants');

const completeOrderAndSendEmail = async (orderNo) => {
  let order;

  if (!orderNo) {
    throw new Error(
      'Complete Payment failed : ' + 'valid orderNo must be defined.'
    );
  }

  try {
    order = await Order.findOneAndUpdate(
      { orderNo },
      {
        status: 'Payment Confirmed',
      }
    ).exec();
    if (!order) {
      throw new Error(
        'Complete Payment failed : ' + 'orderId not found in database.'
      );
    }
  } catch (error) {
    throw new Error('Complete Payment failed : ' + error.message);
  }

  try {
    const subject = `Ultra Movie Shop - Order #${orderNo} placed successfully`;
    const emailBody = constants.emailBodyTemplate.replace(
      '{cartItems}',
      `<ul>${order.cartItems.map((item) => `<li>${item}</li>`)}</ul>`
    );
    await nodemailer.sendEmail(order.email, emailBody, subject);
  } catch (error) {
    throw new Error('Send Email failed : ' + error.message);
  }
};

module.exports = {
  completeOrderAndSendEmail,
};
