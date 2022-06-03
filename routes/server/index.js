const express = require('express');
const router = express.Router();

const stripeRoutes = require('./stripe');

router.use('/stripe', stripeRoutes);

module.exports = router;
