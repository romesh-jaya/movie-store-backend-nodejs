# Backend for Movie Store - NodeJS

Runs a node.js server as the backend, interfacing with mongoDB. Verifies JWT tokens passed in with the requests and also authorizes certain actions which require higher privileges.

Also fetches latest title data from OMDB.

Uses mongoose-sequence plugin to create auto incrementing fields. 

Includes backend functionality for Stripe payments.

All fields mentioned in nodemon.json.example must be filled with correct values and renamed as nodemon.json. 

Note 2022/04: 
Github integration with heroku wasn't working as expected. Use this command to push and build to the heroku git repo:
git push heroku master

## Available Scripts

In the project directory, you can run:

### `npm run start:server`

Runs the app in the development mode. Uses variables from nodemon.json.<br />

### `npm start`

Starts the app. Need to manually set environment variables.




