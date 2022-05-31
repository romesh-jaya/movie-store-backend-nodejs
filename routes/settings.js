const express = require('express');
const router = express.Router();
const checkAdmin = require('../middleware/check-admin');
const Setting = require('../models/setting');

const settingKeys = ['apiKey', 'languages'];

router.get('/', async (_, res) => {
  let settings;
  try {
    settings = await Setting.find({});
  } catch {
    return res.status(500).json({
      message: 'Fetching settings failed: ' + error.message,
    });
  }
  const retVal = [];
  settingKeys.forEach((key) => {
    const retrievedSetting = settings.find((setting) => setting.name === key);
    if (retrievedSetting) {
      retVal.push({
        name: retrievedSetting.name,
        value: retrievedSetting.value,
      });
    } else if (key === 'languages') {
      // default to English if none specified
      retVal.push({ name: key, value: 'English' });
    }
  });

  res.status(200).json(retVal);
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
