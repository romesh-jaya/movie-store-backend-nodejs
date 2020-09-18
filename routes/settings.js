const express = require("express");
const router = express.Router();
const Setting = require("../models/setting");

router.get("/:name", (req, res) => {
  Setting.findOne({ name: req.params.name })
    .then(setting => {
      res.status(200).json({ value: setting.value });
    })
    .catch(error => {
      res.status(500).json({
        message: "Fetching setting failed: " + error.message
      });
    });    
});

router.patch('', (req, res) => {
  Setting.findOneAndUpdate({ name: req.body.name }, { value: req.body.value })
    .then(() => {
      res.status(200).json({ message: "Saving successful!" });
    })
    .catch(error => {
      res.status(500).json({
        message: "Saving failed: " + error.message
      });
    }); 
});

module.exports = router;
