const express = require('express');
const router = express.Router();

const stripeRoutes = require('./stripe');
const paypalRoutes = require('./paypal');

router.use('/stripe', stripeRoutes);
router.use('/paypal', paypalRoutes);

module.exports = router;
