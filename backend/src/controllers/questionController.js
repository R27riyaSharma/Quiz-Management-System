import prisma from '../db.js';

export const getQuestionsForQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const qId = parseInt(quizId, 10);

    const quiz = await prisma.quiz.findUnique({
      where: { id: qId },
      select: { id: true, status: true },
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (req.user.role !== 'ADMIN' && quiz.status !== 'PUBLISHED') {
      return res.status(403).json({ message: 'This quiz is not available' });
    }

    const questions = await prisma.question.findMany({
      where: { quizId: qId },
      include: {
        options: {
          select: {
            id: true,
            optionText: true,
            isCorrect: req.user.role === 'ADMIN', // Only include isCorrect if Admin
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    res.json(questions);
  } catch (error) {
    console.error('Fetch questions error:', error);
    res.status(500).json({ message: 'Server error fetching questions' });
  }
};

export const createQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const qId = parseInt(quizId, 10);
    const { questionText, marks, explanation, difficulty, options } = req.body;

    if (!questionText || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Question text and at least 2 options are required' });
    }

    // Validate that at least one option is correct
    const hasCorrect = options.some((o) => o.isCorrect === true);
    if (!hasCorrect) {
      return res.status(400).json({ message: 'At least one option must be marked as correct' });
    }

    // Create question and options inside a transaction
    const question = await prisma.$transaction(async (tx) => {
      const createdQuestion = await tx.question.create({
        data: {
          quizId: qId,
          questionText,
          marks: parseFloat(marks) || 1.0,
          explanation,
          difficulty: difficulty || 'MEDIUM',
        },
      });

      // Create options
      const optionsData = options.map((opt) => ({
        questionId: createdQuestion.id,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect || false,
      }));

      await tx.option.createMany({
        data: optionsData,
      });

      return tx.question.findUnique({
        where: { id: createdQuestion.id },
        include: { options: true },
      });
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Server error creating question' });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const questionId = parseInt(id, 10);
    const { questionText, marks, explanation, difficulty, options } = req.body;

    if (!questionText || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Question text and at least 2 options are required' });
    }

    const hasCorrect = options.some((o) => o.isCorrect === true);
    if (!hasCorrect) {
      return res.status(400).json({ message: 'At least one option must be marked as correct' });
    }

    const updatedQuestion = await prisma.$transaction(async (tx) => {
      // Update question text and metadata
      await tx.question.update({
        where: { id: questionId },
        data: {
          questionText,
          marks: parseFloat(marks) || 1.0,
          explanation,
          difficulty: difficulty || 'MEDIUM',
        },
      });

      // Delete old options
      await tx.option.deleteMany({
        where: { questionId },
      });

      // Create new options
      const optionsData = options.map((opt) => ({
        questionId,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect || false,
      }));

      await tx.option.createMany({
        data: optionsData,
      });

      return tx.question.findUnique({
        where: { id: questionId },
        include: { options: true },
      });
    });

    res.json(updatedQuestion);
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error updating question' });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const questionId = parseInt(id, 10);

    await prisma.question.delete({ where: { id: questionId } });

    res.json({ message: 'Question and options deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Server error deleting question' });
  }
};
