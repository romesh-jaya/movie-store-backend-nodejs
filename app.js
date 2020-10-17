const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');

//Routes
const moviesRoutes = require('./routes/movies');
const settingsRoutes = require('./routes/settings');

const app = express();

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
// Following prints queries
mongoose.set('debug', (collectionName, method, query, doc) => {
  const currentTime = new Date();
  console.log(
    `${currentTime.toDateString()} ${currentTime.toLocaleTimeString()} ${collectionName}.${method}`,
    JSON.stringify(query),
    doc
  );
});

mongoose
  .connect(process.env.MONGOENDPOINT)
  .then(() => {
    console.log('Connected to database!');
  })
  .catch(() => {
    console.log('Connection failed, exiting!');
    process.exit(-1);
  });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS'
  );
  next();
});

//Introduction message
app.get('/', function (req, res) {
  res.send('Node server is up.');
});

var jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: 'https://movie-shop.us.auth0.com/.well-known/jwks.json',
  }),
  audience: 'https://movie-shop-backend',
  issuer: 'https://movie-shop.us.auth0.com/',
  algorithms: ['RS256'],
});

app.use(jwtCheck);

app.get('/authorized', function (req, res) {
  res.send('Secured Resource');
});

app.use('/movies', moviesRoutes);
app.use('/settings', settingsRoutes);

module.exports = app;
