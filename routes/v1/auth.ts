export {};

const jwt = require('jsonwebtoken');
import { Request as JWTRequest } from 'express-jwt';
const checkAuth = require('../../middleware/check-auth');
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

router.get('/me', checkAuth, (req: JWTRequest, res) => {
  res.status(200).json({
    info: req.auth,
  });
});

module.exports = router;
