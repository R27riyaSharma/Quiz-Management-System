import jwt from 'jsonwebtoken';
import prisma from '../db.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No authentication token provided, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'quiz_platform_jwt_secret_token_987654321');

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists, authorization denied' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Your account is deactivated. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(401).json({ message: 'Token is invalid or expired, authorization denied' });
  }
};

export const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied, administrator role required' });
  }
};

export const studentMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'STUDENT') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied, student role required' });
  }
};
