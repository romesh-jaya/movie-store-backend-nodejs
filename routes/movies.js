const express = require("express");
const router = express.Router();
const NodeCache = require("node-cache");

const myCache = new NodeCache();


router.get("/:id", (req, res) => {
  const value = myCache.get(req.params.id);
  if (value == undefined) {
    res.status(200).json({ count: 0 });
  }
  else {
    res.status(200).json({ count: value });
  }
});


router.patch('', (req, res) => {
  myCache.set(req.body.imdbID, req.body.count);
  res.status(200).json({ message: "Storing movie successful!" });
});

module.exports = router;
