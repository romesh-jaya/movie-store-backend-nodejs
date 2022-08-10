const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const constants = require('../../../../constants');
const paypalCommon = require('./common');
const productsURL = process.env.PAYPAL_GET_PRODUCTS_URL;

router.get('/', async (req, res) => {
  let savedPaymentCustomer = '';
  let subscriptionInfo;
  let accessToken;
  let rentedDVDID;

  try {
    accessToken = await paypalCommon.generateAccessToken();
  } catch (err) {
    const errorConstructEvent = 'Paypal Webhook Error in generateAccessToken: ';
    console.error(errorConstructEvent, err.message);
    return res.status(400).send(`${errorConstructEvent} ${err.message}`);
  }

  try {
    // get product prices
    const response = await fetch(productsURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const responseJson = await response.json();
    if (!(responseJson.products && responseJson.products.length > 0)) {
      const errorConstructEvent = 'Paypal extracting product prices failed';
      console.error(errorConstructEvent);
      return res.status(400).send(errorConstructEvent);
    }

    const rentedDVDInfo = responseJson.products.find(
      (product) => product.id === process.env.PAYPAL_DVD_RENT_PRICE_ID
    );

    if (!rentedDVDInfo) {
      const errorConstructEvent = 'Paypal extracting Rented DVD price failed';
      console.error(errorConstructEvent);
      return res.status(400).send(errorConstructEvent);
    }
    rentedDVDID = rentedDVDInfo.id;
  } catch (err) {
    const errorConstructEvent = 'Paypal Error in fetching product prices: ';
    console.error(errorConstructEvent, err.message);
    return res.status(400).send(`${errorConstructEvent} ${err.message}`);
  }

  console.log('rentedDVDID', rentedDVDID);
  res.send();
});

module.exports = router;
