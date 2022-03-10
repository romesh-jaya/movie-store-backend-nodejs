const fetch = require('node-fetch');

const omdbApiKey = process.env.OMDB_API_KEY;
const omdbUrl = process.env.OMDB_URL;

module.exports = async (movieIMDBIds) => {
  return Promise.all(movieIMDBIds.map((movie) => getMovieDetailsOMDB(movie)));
};

const getMovieDetailsOMDB = async (movieIMDBId) => {
  if (!omdbApiKey || !omdbUrl) {
    throw new Error('omdbApiKey and omdbUrl must be defined in env variables');
  }

  let response = await fetch(
    `${omdbUrl}?apikey=${omdbApiKey}&i=${movieIMDBId}&plot=full`
  );
  let responseJson = await response.json();

  return {
    mediaURL: responseJson.Poster,
    actors: responseJson.Actors,
    plot: responseJson.Plot,
    imdbRating: responseJson.imdbRating,
    imdbID: responseJson.imdbID,
  };
};
