export {};

import express from "express";
const router = express.Router();
const jwt = require('express-jwt');
const jwks = require('jwks-rsa');
const bodyParser = require('body-parser');

const moviesRoutes = require('./movies');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

const jwtCheck = jwt({
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

// Note: comment the following codeblock for testing without passing an OAuth token
router.use(jwtCheck, (err, _, res, __) => {
  console.log('Invalid token provided');
  if (err.name === 'UnauthorizedError') {
    res.status(401).send('Invalid token provided');
  }
});

router.use('/movies', moviesRoutes);

module.exports = router;
