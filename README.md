# Backend for Movie Store - NodeJS

Runs a node.js server as the backend, interfacing with mongoDB. 

## Technical details

- Verifies JWT tokens passed in with the requests and also authorizes certain actions which require higher privileges.

- Fetches latest title data from OMDB.

- Uses mongoose-sequence plugin to create auto incrementing fields. 

- Includes backend functionality for Stripe payments including a webhook.

- Uses Nodemailer to send emails

Note 2022/04: 
Github integration with heroku wasn't working as expected. Use this command to push and build to the heroku git repo:
git push heroku master


## Stripe related info

Make sure to add the following required info:
1. Webhook Endpoint’s secret from your Dashboard’s Webhooks settings to the env variable STRIPE_ENDPOINT_SECRET. https://stripe.com/docs/webhooks/signatures. Note that this is different for localhost and deployed webhooks. 
2. Webhook endpoint to the stripe dashboard, as per the instructions in https://stripe.com/docs/webhooks/go-live. E.g. endpoint can be of the format: https://movie-shop-backend-nodejs.herokuapp.com/api/server/stripe/webhook

Webhook logs can be viewed at: https://dashboard.stripe.com/test/webhooks/

## API Paths

- /api/client - handles all requests from the client. Each request must have a OAuth Auth Token passed in as Authorization Header
- /api/server - handles all requests from the other servers

## .env variables

All fields mentioned in nodemon.json.example must be filled with correct values and renamed as nodemon.json. 

    - MONGOENDPOINT - Mongo DB Atlas connection string
    - STARTPORT - Port that this server will run on. Will be overriden by PORT
    - ADMIN_USER - email address of the user with Admin rights
    - OMDB_API_KEY - API Key obtained for the free OMDB service
    - OMDB_URL - URL of OMDB service 
    - AUDIENCE - OAuth Audience param
    - ISSUER - OAuth Issuer param
    - JWKS_URI - OAuth JWKS_URI param
    - STRIPE_TEST_SECRET_KEY - Stripe Secret Key
    - STRIPE_ENDPOINT_SECRET - Stripe Webhook endpoint Secret
    - DVD_RENT_PRICE_ID - Stripe Price ID for the rentable DVD product
    - EMAIL_ADDRESS - SMTP email address that is used for sending emails by nodemailer
    - EMAIL_PASSWORD - Password for email account

## Available Scripts

In the project directory, you can run:

### `npm run start:server`

Runs the app in the development mode. Uses variables from nodemon.json.<br />

### `npm start`

Starts the app. Need to manually set environment variables.




