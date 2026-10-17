const jwt = require('jsonwebtoken');
const User = require('../models/User');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Configuration error: JWT_SECRET environment variable is required.');
  }
  return secret;
}

async function verifyToken(req) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id);
    return user || null;
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });
  req.user = user;
  next();
}

async function optionalAuth(req, res, next) {
  req.user = await verifyToken(req);
  next();
}

module.exports = { requireAuth, optionalAuth };
