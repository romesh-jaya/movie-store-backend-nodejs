const Order = require('../../../models/order');

const createOrder = async (
  userEmail,
  cartItems,
  paymentDone,
  paymentMethod
) => {
  const order = new Order({
    email: userEmail,
    cartItems,
    created: new Date(),
    status: paymentDone ? 'Payment Confirmed' : 'Payment Initiated',
    paymentMethod,
  });
  const orderDoc = await order.save();
  return { ...orderDoc._doc, id: orderDoc._id };
};

module.exports = {
  createOrder,
};
