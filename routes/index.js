const express = require('express');
const router = express.Router();

const moviesRoutes = require('./movies');
const settingsRoutes = require('./settings');
const paymentsRoutesPrices = require('./payments/stripe/prices');
const paymentsRoutesProducts = require('./payments/stripe/products');
const paymentsRoutesSubscriptions = require('./payments/stripe/subscriptions');
const paymentsRoutesPortal = require('./payments/stripe/portal');

router.use('/movies', moviesRoutes);
router.use('/settings', settingsRoutes);
router.use('/payments/stripe/prices', paymentsRoutesPrices);
router.use('/payments/stripe/products', paymentsRoutesProducts);
router.use('/payments/stripe/subscriptions', paymentsRoutesSubscriptions);
router.use('/payments/stripe/portal', paymentsRoutesPortal);

module.exports = router;
