# Backend for Movie Store - NodeJS

Runs a node.js server as the backend, interfacing with mongoDB. Verifies JWT tokens passed in with the requests and also authorizes certain actions which require higher privileges.

Also fetches latest title data from OMDB.

Uses mongoose-sequence plugin to create auto incrementing fields. 

Includes backend functionality for Stripe payments.
