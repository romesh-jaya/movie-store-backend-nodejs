const express = require('express');
const router = express.Router();
const checkAdmin = require('../middleware/check-admin');
const Setting = require('../models/setting');

router.get('/:name', (req, res) => {
  const name = req.params.name;
  Setting.findOne({ name })
    .then((setting) => {
      res.status(200).json({ value: setting.value });
    })
    .catch((error) => {
      if (name === 'languages') {
        // default to English if none specified
        res.status(200).json({ value: ['English'] });
      }
      res.status(500).json({
        message: 'Fetching setting failed: ' + error.message,
      });
    });
});

router.patch('', checkAdmin, (req, res) => {
  const data = req.body.data;

  if (!data) {
    return res.status(500).json({
      message: 'At least one field must be defined to save.',
    });
  }

  const promiseArray = data.map((dataOne) =>
    Setting.findOneAndUpdate(
      { name: dataOne.name },
      { value: dataOne.value },
      { upsert: true }
    )
  );

  Promise.all(promiseArray)
    .then(() => {
      return res.status(200).json({ message: 'Saving successful!' });
    })
    .catch((error) => {
      res.status(500).json({
        message: 'Saving failed: ' + error.message,
      });
    });
});

module.exports = router;
