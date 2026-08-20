import express from 'express';
import { getUsers, getUserById, updateUserStatus, deleteUser } from '../controllers/userController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes are Admin-only
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.patch('/:id/status', updateUserStatus);
router.delete('/:id', deleteUser);

export default router;
