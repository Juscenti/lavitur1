// backend/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/keys.js';

export const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'admin' && decoded.role !== 'representative') {
      return res.status(403).json({ message: 'Access denied: Not admin' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
