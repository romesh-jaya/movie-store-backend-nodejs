export {};

import express from 'express';
const router = express.Router();
var { expressjwt: jwt } = require('express-jwt');
const bodyParser = require('body-parser');

const authRoutes = require('./auth');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

const jwtCheck = jwt({
  secret: process.env.HASHSECRET,
  algorithms: ['HS256'],
  credentialsRequired: false,
});

// Note: comment the following codeblock for testing without passing an OAuth token
router.use(jwtCheck, (err, _, res, __) => {
  console.log('Invalid token provided');
  if (err.name === 'UnauthorizedError') {
    res.status(401).send('Invalid token provided');
  }
});

router.use('/auth', authRoutes);

module.exports = router;
