const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const orderSchema = mongoose.Schema({
  email: { type: String, required: true },
  created: { type: Date, required: true },
  cartItems: { type: [String], required: true },
  status: { type: String, required: true },
});

orderSchema.plugin(AutoIncrement, { inc_field: 'orderNo' });

module.exports = mongoose.model('Order', orderSchema);
