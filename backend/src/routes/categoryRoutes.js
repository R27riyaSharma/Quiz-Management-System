import express from 'express';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// Public read (for all authenticated users)
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin-only write
router.post('/', adminMiddleware, createCategory);
router.put('/:id', adminMiddleware, updateCategory);
router.delete('/:id', adminMiddleware, deleteCategory);

export default router;
