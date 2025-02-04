export {};

const jwt = require('jsonwebtoken');
import express from 'express';
const router = express.Router();

router.post('/login', (req, res) => {
  const token = jwt.sign({ id: 1 }, process.env.HASHSECRET, {
    expiresIn: process.env.TOKENEXPIRATION,
  });

  res.status(200).json({
    token: token,
    isAdmin: true,
    //refreshToken: refreshToken,
  });
});

module.exports = router;
