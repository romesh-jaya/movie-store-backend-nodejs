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
router.use(jwtCheck, (err, _, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).send({ message: 'Invalid token provided' });
  }
  next(err);
});

router.use('/auth', authRoutes);

module.exports = router;
