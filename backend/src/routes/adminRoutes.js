import express from 'express';
import { getAnalytics } from '../controllers/adminController.js';
import { getAttempts, getAttemptById } from '../controllers/attemptController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/analytics', getAnalytics);
router.get('/attempts', getAttempts);
router.get('/attempts/:id', getAttemptById);

export default router;
