module.exports = (req, res, next) => {
  if (req.userEmail && req.userEmail == process.env.ADMIN_USER) {
    return next();
  }
  return res.status(401).json({ message: 'Authentication failed!' });
};
