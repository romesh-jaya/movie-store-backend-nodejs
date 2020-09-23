const express = require('express');
const router = express.Router();
const Movie = require('../models/movie');

router.get('', (req, res) => {
  const searchTitle = req.query.searchTitle;
  const searchType = req.query.searchType;
  const searchYear = req.query.searchYear;

  const aggregations = [];

  if (searchTitle) {
    aggregations.push({ $match: { title: new RegExp(searchTitle, 'i') } });
  }
  if (searchType) {
    aggregations.push({ $match: { type: new RegExp(searchType, 'i') } });
  }
  if (searchYear) {
    // convert year column to a number for query purpose to temp column 'compareStr'
    aggregations.push({ $addFields: { compareStr: { $toString: '$year' } } });
    aggregations.push({ $match: { compareStr: new RegExp(searchYear) } });
  }

  //Use aggregate as we need facet for obtaining count
  Movie.aggregate(aggregations)
    .then((movies) => {
      res.status(200).json(movies);
    })
    .catch((error) => {
      return res.status(500).json({
        message: 'Retrieving movies failed (search) : ' + error.message,
      });
    });
});

router.get('/:id', (req, res) => {
  Movie.findOne({ imdbID: req.params.id })
    .then((savedMovie) => {
      res.status(200).json({ count: savedMovie.count });
    })
    .catch(() => {
      res.status(200).json({ count: 0 });
    });
});

router.post('', (req, res) => {
  const movie = new Movie({
    imdbID: req.body.imdbID,
    count: req.body.count,
    title: req.body.title,
    year: req.body.year,
    type: req.body.type,
    pGRating: req.body.pGRating,
    language: req.body.language,
    genre: req.body.genre,
  });
  movie
    .save()
    .then((savedMovie) => {
      res.status(201).json({
        message: 'Movie saved successfully',
        id: savedMovie._id,
      });
    })
    .catch((error) => {
      res.status(500).json({
        message: 'Saving movie failed : ' + error.message,
      });
    });
});

router.patch('', (req, res) => {
  Movie.findOneAndUpdate({ _id: req.body.id }, { count: req.body.count })
    .then(() => {
      res.status(200).json({ message: 'Update successful!' });
    })
    .catch((error) => {
      return res.status(500).json({
        message: 'Updating movie failed: ' + error.message,
      });
    });
});

module.exports = router;
