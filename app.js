const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');

//Routes
const moviesRoutes = require('./routes/movies');
const settingsRoutes = require('./routes/settings');
const paymentsRoutes = require('./routes/payments');

const app = express();

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
    console.log('Mongo connection failed, exiting!');
    process.exit(-1);
  });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use((_, res, next) => {
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
app.get('/', function (_, res) {
  res.send('Node server is up.');
});

var jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.JWKS_URI,
  }),
  audience: process.env.AUDIENCE,
  issuer: process.env.ISSUER,
  algorithms: ['RS256'],
});

/*
app.use(jwtCheck, (err, _, res, __) => {
  console.log('Invalid token provided');
  if (err.name === 'UnauthorizedError') {
    res.status(401).send('Invalid token provided');
  }
});
*/

app.use(function (req, _, next) {
  // Custom claim is set in the access token via rules.
  // Go to Auth0 dashboard -> Rules to see the following rule:
  /*   
   function (user, context, callback) {    
    const namespace = 'https://movie-shop-backend';
    context.accessToken[namespace + '/email'] = user.email;
    callback(null, user, context);
  } 
  */
  // Alternate is to pass in the id_token and decode it

  const userEmail = req.user && req.user['https://movie-shop-backend/email'];
  if (userEmail) {
    // Append info to request for use in middleware
    console.log('email: ', userEmail);
    req.userEmail = userEmail;
  }
  next();
});

app.use('/movies', moviesRoutes);
app.use('/settings', settingsRoutes);
app.use('/payments', paymentsRoutes);

module.exports = app;
