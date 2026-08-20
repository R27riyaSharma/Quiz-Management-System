import express from 'express';
import { getQuizzes, getQuizById, createQuiz, updateQuiz, deleteQuiz, publishQuiz } from '../controllers/quizController.js';
import { getQuestionsForQuiz, createQuestion, updateQuestion, deleteQuestion } from '../controllers/questionController.js';
import { startAttempt, submitAttempt } from '../controllers/attemptController.js';
import { authMiddleware, adminMiddleware, studentMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// Quizzes base endpoints
router.get('/', getQuizzes);
router.get('/:id', getQuizById);

router.post('/', adminMiddleware, createQuiz);
router.put('/:id', adminMiddleware, updateQuiz);
router.delete('/:id', adminMiddleware, deleteQuiz);
router.patch('/:id/publish', adminMiddleware, publishQuiz);

// Nested Questions endpoints
router.get('/:quizId/questions', getQuestionsForQuiz);
router.post('/:quizId/questions', adminMiddleware, createQuestion);
router.put('/questions/:id', adminMiddleware, updateQuestion);
router.delete('/questions/:id', adminMiddleware, deleteQuestion);

// Quiz Attempts (Student only)
router.post('/:quizId/start', studentMiddleware, startAttempt);
router.post('/:quizId/submit', studentMiddleware, submitAttempt);

export default router;
