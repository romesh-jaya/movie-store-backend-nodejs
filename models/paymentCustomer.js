const mongoose = require('mongoose');

const paymentCustomerSchema = mongoose.Schema({
  email: { type: String, required: true, unique: true },
  paymentCustomerIdStripe: { type: String, required: true },
});

module.exports = mongoose.model('PaymentCustomer', paymentCustomerSchema);
