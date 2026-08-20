import express from 'express';
import { getAttempts, getAttemptById } from '../controllers/attemptController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAttempts);
router.get('/:id', getAttemptById);

export default router;
