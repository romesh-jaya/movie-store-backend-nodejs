// ----------------------------------------------------------------------
// Run this first to provide the required config to other library imports
if (process.env.NODE_ENV === 'production') {
  const dotenv = require('dotenv');
  console.log('Loading dotenv variables');
  dotenv.config();
}
// ----------------------------------------------------------------------

const express = require('express');
const clientRoutes = require('./routes/v1');

const app = express();

const port: number = parseInt(
  process.env.PORT || process.env.STARTPORT || '3000'
);

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

app.use('/api/v1', clientRoutes);

app.listen(port, function () {
  console.log(`App is listening on port ${port} !`);
});

module.exports = app;
