const express = require('express');
const router = express.Router();
const paypalCommon = require('./common');

// get only the first subscription, since we don't expect multiple subscriptions for a single
// customer to be possible
router.get('/get-user-subscription', async (req, res) => {
  const { userEmail } = req;

  try {
    const subscriptionInfo = await paypalCommon.getActiveSubscriptionInfo(
      userEmail
    );
    if (subscriptionInfo.lookupKey) {
      return res.json(subscriptionInfo);
    }
    return res.json({});
  } catch (error) {
    return res.status(500).json({
      message: 'Retrieving User Subscriptions failed : ' + error.message,
    });
  }
});

module.exports = router;
