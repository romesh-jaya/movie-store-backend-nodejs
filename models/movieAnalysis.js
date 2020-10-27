const mongoose = require('mongoose');

const movieAnalSchema = mongoose.Schema({
  searchedOn: { type: Date, required: true },
  genre: { type: [String], required: true },
});

module.exports = mongoose.model('MovieAnalysis', movieAnalSchema);
