const mongoose = require('mongoose');

const settingSchema = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: String }
});

var handleE11000 = function (error, res, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Setting already exists.'));
  } else {
    next();
  }
};

settingSchema.post('save', handleE11000);
settingSchema.post('update', handleE11000);
settingSchema.post('findOneAndUpdate', handleE11000);

module.exports = mongoose.model('Setting', settingSchema);
