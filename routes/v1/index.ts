export {};

import express from 'express';
const router = express.Router();
const bodyParser = require('body-parser');

const authRoutes = require('./auth');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

router.use('/auth', authRoutes);

module.exports = router;
