const Order = require('../../models/order');
const nodemailer = require('../../utils/nodemailer');
const constants = require('../../constants');

const sendEmailOrderCompletion = async (orderInfo) => {
  try {
    const subject = `Ultra Movie Shop - Order #${orderInfo.orderNo} placed successfully`;
    const emailBody = constants.emailBodyTemplate.replace(
      '{cartItems}',
      `<ul>${orderInfo.cartItems
        .map((item) => `<li>${item}</li>`)
        .join('')}</ul>`
    );
    await nodemailer.sendEmail(orderInfo.email, emailBody, subject);
  } catch (error) {
    // TODO: implement Sentry for this case.
    // Allow the API call to succeed. Don't block the flow for the email error
    console.error('Send email error: ', err.message);
  }
};

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

  await sendEmailOrderCompletion(order);
};

module.exports = {
  completeOrderAndSendEmail,
  sendEmailOrderCompletion,
};
