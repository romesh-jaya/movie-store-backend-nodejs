const express = require('express');
const router = express.Router();
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');

const moviesRoutes = require('./movies');
const settingsRoutes = require('./settings');
const paymentsRoutesPrices = require('./payments/stripe/prices');
const paymentsRoutesProducts = require('./payments/stripe/products');
const paymentsRoutesSubscriptions = require('./payments/stripe/subscriptions');
const paymentsRoutesPortal = require('./payments/stripe/portal');

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

router.use(jwtCheck, (err, _, res, __) => {
  console.log('Invalid token provided');
  if (err.name === 'UnauthorizedError') {
    res.status(401).send('Invalid token provided');
  }
});

router.use((req, _, next) => {
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
    req.userEmail = userEmail;
  }
  next();
});

router.use('/movies', moviesRoutes);
router.use('/settings', settingsRoutes);
router.use('/payments/stripe/prices', paymentsRoutesPrices);
router.use('/payments/stripe/products', paymentsRoutesProducts);
router.use('/payments/stripe/subscriptions', paymentsRoutesSubscriptions);
router.use('/payments/stripe/portal', paymentsRoutesPortal);

module.exports = router;
