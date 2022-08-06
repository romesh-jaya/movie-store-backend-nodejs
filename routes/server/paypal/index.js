const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const bodyParser = require('body-parser');

const webhookID = process.env.WEBHOOK_ID;
const verifyURL = process.env.PAYPAL_VERIFY_URL;
const clientID = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const authURL = process.env.PAYPAL_AUTH_URL;
const orderInfoURL = process.env.PAYPAL_GET_ORDER_INFO_URL;

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
  let paypalOrderID;
  let orderNo;

  const body = {
    webhook_id: webhookID,
    transmission_id: transmissionID,
    transmission_time: transmissionTime,
    cert_url: certURL,
    auth_algo: authAlgo,
    transmission_sig: transmissionSig,
    webhook_event: payload,
  };

  if (
    !webhookID ||
    !verifyURL ||
    !clientID ||
    !clientSecret ||
    !authURL ||
    !orderInfoURL
  ) {
    const errorParams =
      'Paypal Webhook Error: webhookID, clientID, clientSecret, authURL, orderInfoURL or verifyURL was found to be empty';
    console.error(errorParams);
    return res.status(400).send(errorParams);
  }

  if (
    !(
      payload.resource &&
      payload.resource.supplementary_data &&
      payload.resource.supplementary_data.related_ids &&
      payload.resource.supplementary_data.related_ids.order_id
    )
  ) {
    const errorConstructEvent =
      'Paypal Webhook Error, order ID not found in payload';
    console.error(errorConstructEvent);
    return res.status(400).send(errorConstructEvent);
  }

  try {
    accessToken = await generateAccessToken();
  } catch (err) {
    const errorConstructEvent = 'Paypal Webhook Error in generateAccessToken: ';
    console.error(errorConstructEvent, err.message);
    return res.status(400).send(`${errorConstructEvent} ${err.message}`);
  }

  try {
    // let Paypal verify if this was actually sent by them
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

  try {
    paypalOrderID = payload.resource.supplementary_data.related_ids.order_id;
    // get our order no from PayPal Order Info
    let response = await fetch(`${orderInfoURL}/${paypalOrderID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    let responseJson = await response.json();
    if (
      !(
        responseJson.purchase_units &&
        responseJson.purchase_units.length > 0 &&
        responseJson.purchase_units[0].reference_id
      )
    ) {
      const errorConstructEvent =
        'Paypal Webhook Error, reference_id not found in retrieved order info';
      console.error(errorConstructEvent);
      return res.status(400).send(errorConstructEvent);
    }
    orderNo = responseJson.purchase_units.reference_id;
  } catch (err) {
    const errorConstructEvent = 'Paypal Webhook Error in verify: ';
    console.error(errorConstructEvent, err.message);
    return res.status(400).send(`${errorConstructEvent} ${err.message}`);
  }

  res.status(200).send();
});

module.exports = router;
