const mongoose = require('mongoose');

const movieSchema = mongoose.Schema({
  addedOn: { type: Date, required: true },
  count: { type: Number, required: true },
  genre: { type: [String], required: true },
  imdbID: { type: String, required: true, unique: true },
  languages: { type: [String], required: true },
  pGRating: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, required: true },
  year: { type: String, required: true },
});

var handleE11000 = function (error, res, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Movie already exists.'));
  } else {
    next();
  }
};

movieSchema.post('save', handleE11000);
movieSchema.post('update', handleE11000);
movieSchema.post('findOneAndUpdate', handleE11000);

module.exports = mongoose.model('Movie', movieSchema);
