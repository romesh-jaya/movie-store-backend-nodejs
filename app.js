const express = require('express');
const mongoose = require('mongoose');
const clientRoutes = require('./routes/client');
const serverRoutes = require('./routes/server');
const MongoDBUtil = require('./utils/mongodb');

const app = express();

// Following prints queries
mongoose.set('debug', (collectionName, method, query, doc) => {
  const currentTime = new Date();
  console.log(
    `${currentTime.toDateString()} ${currentTime.toLocaleTimeString()} ${collectionName}.${method}`,
    JSON.stringify(query),
    doc
  );
});

mongoose
  .connect(process.env.MONGOENDPOINT)
  .then(() => {
    console.log('Connected to database!');
  })
  .catch(() => {
    MongoDBUtil.sendEmailDBDown().then(() => {
      console.log('Mongo connection failed, exiting!');
      process.exit(-1);
    });
  });

app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS'
  );
  next();
});

//Introduction message
app.get('/', function (_, res) {
  res.send('Node server is up.');
});

app.use('/api/client', clientRoutes);
app.use('/api/server', serverRoutes);

module.exports = app;
