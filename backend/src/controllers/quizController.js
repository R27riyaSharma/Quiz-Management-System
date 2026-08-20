import prisma from '../db.js';

export const getQuizzes = async (req, res) => {
  try {
    const { categoryId, difficulty, search } = req.query;

    const whereClause = {};

    // Role-based quiz visibility
    if (req.user.role !== 'ADMIN') {
      whereClause.status = 'PUBLISHED';
    }

    // Filters
    if (categoryId) {
      whereClause.categoryId = parseInt(categoryId, 10);
    }

    if (difficulty) {
      whereClause.difficulty = difficulty.toUpperCase();
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const quizzes = await prisma.quiz.findMany({
      where: whereClause,
      include: {
        category: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
        attempts: {
          where: { userId: req.user.id },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format quizzes to return attempts remaining, etc.
    const formattedQuizzes = quizzes.map((q) => {
      const userAttemptsCount = q.attempts.length;
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        categoryId: q.categoryId,
        categoryName: q.category.name,
        difficulty: q.difficulty,
        duration: q.duration,
        passingScore: q.passingScore,
        maxAttempts: q.maxAttempts,
        status: q.status,
        questionCount: q._count.questions,
        totalAttemptsCount: q._count.attempts,
        userAttemptsCount,
        attemptsRemaining: Math.max(0, q.maxAttempts - userAttemptsCount),
        createdAt: q.createdAt,
      };
    });

    res.json(formattedQuizzes);
  } catch (error) {
    console.error('Fetch quizzes error:', error);
    res.status(500).json({ message: 'Server error fetching quizzes' });
  }
};

export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const quizId = parseInt(id, 10);

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        category: {
          select: { name: true },
        },
        _count: {
          select: { questions: true },
        },
        attempts: {
          where: { userId: req.user.id },
          select: { id: true, score: true, status: true, startedAt: true },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (req.user.role !== 'ADMIN' && quiz.status !== 'PUBLISHED') {
      return res.status(403).json({ message: 'This quiz is not available' });
    }

    const userAttemptsCount = quiz.attempts.length;
    const formattedQuiz = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      categoryId: quiz.categoryId,
      categoryName: quiz.category.name,
      difficulty: quiz.difficulty,
      duration: quiz.duration,
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
      status: quiz.status,
      questionCount: quiz._count.questions,
      userAttemptsCount,
      attemptsRemaining: Math.max(0, quiz.maxAttempts - userAttemptsCount),
      userAttempts: quiz.attempts,
      createdAt: quiz.createdAt,
    };

    res.json(formattedQuiz);
  } catch (error) {
    console.error('Fetch quiz detail error:', error);
    res.status(500).json({ message: 'Server error fetching quiz details' });
  }
};

export const createQuiz = async (req, res) => {
  try {
    const { title, description, categoryId, difficulty, duration, passingScore, maxAttempts, status } = req.body;

    if (!title || !categoryId || !difficulty || !duration || !passingScore) {
      return res.status(400).json({ message: 'Title, category, difficulty, duration, and passing score are required' });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        categoryId: parseInt(categoryId, 10),
        difficulty: difficulty.toUpperCase(),
        duration: parseInt(duration, 10),
        passingScore: parseInt(passingScore, 10),
        maxAttempts: maxAttempts ? parseInt(maxAttempts, 10) : 1,
        status: status || 'DRAFT',
      },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ message: 'Server error creating quiz' });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quizId = parseInt(id, 10);
    const { title, description, categoryId, difficulty, duration, passingScore, maxAttempts, status } = req.body;

    if (!title || !categoryId || !difficulty || !duration || !passingScore) {
      return res.status(400).json({ message: 'Title, category, difficulty, duration, and passing score are required' });
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title,
        description,
        categoryId: parseInt(categoryId, 10),
        difficulty: difficulty.toUpperCase(),
        duration: parseInt(duration, 10),
        passingScore: parseInt(passingScore, 10),
        maxAttempts: parseInt(maxAttempts, 10),
        status: status || 'DRAFT',
      },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    res.json(updatedQuiz);
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ message: 'Server error updating quiz' });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quizId = parseInt(id, 10);

    await prisma.quiz.delete({ where: { id: quizId } });

    res.json({ message: 'Quiz and all its questions deleted successfully' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ message: 'Server error deleting quiz' });
  }
};

export const publishQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const quizId = parseInt(id, 10);

    if (!status || !['DRAFT', 'PUBLISHED', 'UNPUBLISHED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: { status },
    });

    res.json({ message: `Quiz status updated to ${status}`, quiz: updatedQuiz });
  } catch (error) {
    console.error('Publish quiz error:', error);
    res.status(500).json({ message: 'Server error updating quiz status' });
  }
};
