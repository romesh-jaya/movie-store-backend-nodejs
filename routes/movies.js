const express = require('express');
const router = express.Router();
const Movie = require('../models/movie');

router.get('', (req, res) => {
  const searchTitle = req.query.searchTitle;
  const searchType = req.query.searchType;
  const searchYearExact = req.query.searchYearExact;
  const searchYearFrom = req.query.searchYearFrom;
  const searchYearTo = req.query.searchYearTo;
  const searchGenres = req.query.searchGenres;
  const searchLanguage = req.query.searchLanguage;
  const pageSize = +req.query.pageSize;
  const currentPage = +req.query.page;
  const queryAll = req.query.queryAll;

  const aggregations = [];

  if (
    !queryAll &&
    (pageSize == null || currentPage == null || pageSize < 1 || currentPage < 0)
  ) {
    return res.status(500).json({
      message:
        'Retrieving movies failed (search) : ' +
        'Valid pagesize, page no must be specified.',
    });
  }

  if (
    !(
      searchYearExact ||
      searchYearFrom ||
      searchYearTo ||
      searchTitle ||
      searchType ||
      searchGenres ||
      searchLanguage
    )
  ) {
    return res.status(500).json({
      message:
        'Retrieving movies failed (search) : ' +
        'At least one search field must be defined.',
    });
  }

  if (
    (searchYearExact && isNaN(searchYearExact)) ||
    (searchYearFrom && isNaN(searchYearFrom)) ||
    (searchYearTo && isNaN(searchYearTo))
  ) {
    return res.status(500).json({
      message:
        'Retrieving movies failed (search) : ' +
        'Error converting string to number in year data',
    });
  }

  if (searchTitle) {
    aggregations.push({ $match: { title: new RegExp(searchTitle, 'i') } });
  }
  if (searchType) {
    aggregations.push({ $match: { type: new RegExp(searchType, 'i') } });
  }
  if (searchLanguage) {
    aggregations.push({
      $match: {
        languages: {
          $elemMatch: { $eq: searchLanguage },
        },
      },
    });
  }
  if (searchGenres) {
    aggregations.push({
      $match: {
        genre: {
          $in: searchGenres,
        },
      },
    });
  }

  if (searchYearExact) {
    aggregations.push({ $match: { year: { $eq: searchYearExact } } });
  } else if (searchYearFrom && searchYearTo) {
    aggregations.push({ $match: { year: { $gt: searchYearFrom } } });
    aggregations.push({ $match: { year: { $lt: searchYearTo } } });
  } else if (searchYearFrom) {
    aggregations.push({ $match: { year: { $gt: searchYearFrom } } });
  } else if (searchYearTo) {
    aggregations.push({ $match: { year: { $lt: searchYearTo } } });
  }

  aggregations.push({ $sort: { title: 1 } });

  // pass in all movie documents if queryAll === true
  const moviesVal = queryAll
    ? [{ $match: { _id: { $exists: true } } }]
    : [{ $skip: pageSize * currentPage }, { $limit: pageSize }];

  aggregations.push({
    $facet: {
      movies: moviesVal,
      movieCount: [
        {
          $count: 'count',
        },
      ],
    },
  });

  //Use aggregate as we need facet for obtaining count
  Movie.aggregate(aggregations)
    .then((movieData) => {
      // rename _id to id
      const movies = movieData[0].movies.map((doc) => {
        const newDoc = {
          ...doc,
          id: doc._id,
        };
        delete newDoc._id;
        delete newDoc.__v;
        return newDoc;
      });
      const newRetVal = { movies, movieCount: movieData[0].movieCount };
      res.status(200).json({ movies: newRetVal });
    })
    .catch((error) => {
      return res.status(500).json({
        message: 'Retrieving movies failed (search) : ' + error.message,
      });
    });
});

router.get('/imdbid/:id', (req, res) => {
  Movie.findOne({ imdbID: req.params.id })
    .then((savedMovie) => {
      res.status(200).json({
        count: savedMovie.count,
        id: savedMovie._id,
        languages: savedMovie.languages,
      });
    })
    .catch(() => {
      res.status(200).json({ count: 0, languages: [] });
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
    languages: req.body.languages,
    genre: req.body.genre,
  });
  movie.addedOn = new Date();
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
  Movie.findOneAndUpdate(
    { _id: req.body.id },
    { count: req.body.count, languages: req.body.languages }
  )
    .then(() => {
      res.status(200).json({ message: 'Update successful!' });
    })
    .catch((error) => {
      return res.status(500).json({
        message: 'Updating movie failed: ' + error.message,
      });
    });
});

router.delete('', (req, res) => {
  Movie.deleteMany({ _id: { $in: req.query.idArray } })
    .then(() => {
      res.status(200).json({ message: 'Delete successful!' });
    })
    .catch((error) => {
      return res.status(500).json({
        message: 'Deleting movie failed: ' + error.message,
      });
    });
});

module.exports = router;
