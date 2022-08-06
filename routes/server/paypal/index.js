const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const bodyParser = require('body-parser');

const webhookID = process.env.WEBHOOK_ID;
const verifyURL = process.env.PAYPAL_VERIFY_URL;
const clientID = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const authURL = process.env.PAYPAL_AUTH_URL;

// Access token is used to authenticate all REST API requests
// Taken from https://developer.paypal.com/docs/checkout/advanced/integrate/#link-generateclienttoken
async function generateAccessToken() {
  const auth = Buffer.from(clientID + ':' + clientSecret).toString('base64');

  const response = await fetch(authURL, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  const data = await response.json();
  return data.access_token;
}

router.post('/webhook', bodyParser.json(), async (req, res) => {
  const payload = req.body;
  const transmissionID = req.headers['paypal-transmission-id'];
  const transmissionTime = req.headers['paypal-transmission-time'];
  const certURL = req.headers['paypal-cert-url'];
  const authAlgo = req.headers['paypal-auth-algo'];
  const transmissionSig = req.headers['paypal-transmission-sig'];
  let accessToken;

  const body = {
    webhook_id: webhookID,
    transmission_id: transmissionID,
    transmission_time: transmissionTime,
    cert_url: certURL,
    auth_algo: authAlgo,
    transmission_sig: transmissionSig,
    webhook_event: payload,
  };

  if (!webhookID || !verifyURL || !clientID || !clientSecret || !authURL) {
    const errorParams =
      'Paypal Webhook Error: webhookID, clientID, clientSecret, authURL or verifyURL was found to be empty';
    console.error(errorParams);
    return res.status(400).send(errorParams);
  }

  try {
    accessToken = await generateAccessToken();
  } catch (err) {
    const errorConstructEvent = 'Paypal Webhook Error in generateAccessToken: ';
    console.error(errorConstructEvent, err.message);
    return res.status(400).send(`${errorConstructEvent} ${err.message}`);
  }

  try {
    let response = await fetch(verifyURL, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    let responseJson = await response.json();
    if (responseJson.verification_status !== 'SUCCESS') {
      const errorConstructEvent =
        'Paypal Webhook Error, payload verification failure.';
      console.error(errorConstructEvent);
      return res.status(400).send(errorConstructEvent);
    }
  } catch (err) {
    const errorConstructEvent = 'Paypal Webhook Error in verify: ';
    console.error(errorConstructEvent, err.message);
    return res.status(400).send(`${errorConstructEvent} ${err.message}`);
  }

  res.status(200).send();
});

module.exports = router;
