const mongoose = require('mongoose');

const payPalSubscriptionSchema = mongoose.Schema({
  email: { type: String, required: true, unique: true },
  subscriptionID: { type: String, required: true },
});

module.exports = mongoose.model('PayPalSubscription', payPalSubscriptionSchema);
