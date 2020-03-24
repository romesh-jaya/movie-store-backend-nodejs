const express = require("express");
const router = express.Router();
const NodeCache = require("node-cache");

const myCache = new NodeCache();


router.get("/:id", (req, res) => {
  const value = myCache.get(req.params.id);
  if (value == undefined) {
    res.status(200).json({ value: 'db923a55' }); // default
  }
  else {
    res.status(200).json({ value: value });
  }
});


router.patch('', (req, res) => {
  myCache.set(req.body.id, req.body.value);
  res.status(200).json({ message: "Storing setting successful!" });
});

module.exports = router;
