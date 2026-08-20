import prisma from '../db.js';

export const startAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    const qId = parseInt(quizId, 10);
    const userId = req.user.id;

    // Fetch quiz
    const quiz = await prisma.quiz.findUnique({
      where: { id: qId },
      include: {
        _count: { select: { questions: true } },
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.status !== 'PUBLISHED') {
      return res.status(403).json({ message: 'This quiz is not available for attempts' });
    }

    if (quiz._count.questions === 0) {
      return res.status(400).json({ message: 'This quiz has no questions and cannot be started' });
    }

    // Check attempt limits
    const existingAttemptsCount = await prisma.attempt.count({
      where: { quizId: qId, userId },
    });

    if (existingAttemptsCount >= quiz.maxAttempts) {
      return res.status(400).json({
        message: `You have reached the maximum allowed attempts (${quiz.maxAttempts}) for this quiz.`,
      });
    }

    // Create new attempt
    const attempt = await prisma.attempt.create({
      data: {
        quizId: qId,
        userId,
        score: 0,
        percentage: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        unanswered: quiz._count.questions,
        timeTaken: 0,
        status: 'FAILED', // Default until submission
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // Fetch questions for the frontend (removing isCorrect information)
    const questions = await prisma.question.findMany({
      where: { quizId: qId },
      include: {
        options: {
          select: {
            id: true,
            optionText: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    res.status(201).json({
      attemptId: attempt.id,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        duration: quiz.duration,
        passingScore: quiz.passingScore,
      },
      questions,
    });
  } catch (error) {
    console.error('Start quiz attempt error:', error);
    res.status(500).json({ message: 'Server error starting quiz attempt' });
  }
};

export const submitAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { attemptId, answers } = req.body; // answers: [ { questionId, selectedOptionId }, ... ]
    const qId = parseInt(quizId, 10);
    const userId = req.user.id;

    if (!attemptId) {
      return res.status(400).json({ message: 'Attempt ID is required' });
    }

    // Fetch attempt details
    const attempt = await prisma.attempt.findUnique({
      where: { id: parseInt(attemptId, 10) },
      include: { quiz: true },
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    if (attempt.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized submission' });
    }

    // Check if already completed (prevent duplicate submissions)
    const answersCount = await prisma.answer.count({
      where: { attemptId: attempt.id },
    });
    if (answersCount > 0) {
      return res.status(400).json({ message: 'This quiz attempt has already been submitted' });
    }

    const completedAt = new Date();
    const durationSeconds = attempt.quiz.duration * 60;
    const actualElapsedSeconds = Math.max(1, Math.floor((completedAt.getTime() - attempt.startedAt.getTime()) / 1000));

    // Fetch all questions and their correct options
    const questions = await prisma.question.findMany({
      where: { quizId: qId },
      include: { options: true },
    });

    let correctAnswersCount = 0;
    let incorrectAnswersCount = 0;
    let unansweredCount = 0;
    let totalMarks = 0;
    let obtainedMarks = 0;

    const answersToCreate = [];

    // Evaluate answers
    for (const question of questions) {
      totalMarks += question.marks;

      // Find the submitted answer for this question
      const submittedAnswer = answers ? answers.find((a) => a.questionId === question.id) : null;
      const selectedOptionId = submittedAnswer ? submittedAnswer.selectedOptionId : null;

      if (!selectedOptionId) {
        unansweredCount++;
        answersToCreate.push({
          attemptId: attempt.id,
          questionId: question.id,
          selectedOptionId: null,
          isCorrect: false,
        });
      } else {
        // Find option and check if correct
        const option = question.options.find((o) => o.id === selectedOptionId);
        const isCorrect = option ? option.isCorrect : false;

        if (isCorrect) {
          correctAnswersCount++;
          obtainedMarks += question.marks;
        } else {
          incorrectAnswersCount++;
        }

        answersToCreate.push({
          attemptId: attempt.id,
          questionId: question.id,
          selectedOptionId,
          isCorrect,
        });
      }
    }

    // Score calculations
    const percentage = totalMarks > 0 ? parseFloat(((obtainedMarks / totalMarks) * 100).toFixed(1)) : 0;
    const isPassed = percentage >= attempt.quiz.passingScore;
    const status = isPassed ? 'PASSED' : 'FAILED';
    const timeTaken = Math.min(durationSeconds, actualElapsedSeconds);

    // Save transactionally
    const updatedAttempt = await prisma.$transaction(async (tx) => {
      // Save student answers
      await tx.answer.createMany({
        data: answersToCreate,
      });

      // Update attempt
      return tx.attempt.update({
        where: { id: attempt.id },
        data: {
          score: obtainedMarks,
          percentage,
          correctAnswers: correctAnswersCount,
          incorrectAnswers: incorrectAnswersCount,
          unanswered: unansweredCount,
          timeTaken,
          status,
          completedAt,
        },
        include: {
          quiz: {
            select: { title: true },
          },
        },
      });
    });

    res.json({
      message: 'Quiz submitted successfully',
      attempt: updatedAttempt,
    });
  } catch (error) {
    console.error('Submit quiz attempt error:', error);
    res.status(500).json({ message: 'Server error submitting quiz' });
  }
};

export const getAttempts = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let attempts;
    if (role === 'ADMIN') {
      attempts = await prisma.attempt.findMany({
        include: {
          quiz: {
            select: { title: true, category: { select: { name: true } } },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { completedAt: 'desc' },
      });
    } else {
      attempts = await prisma.attempt.findMany({
        where: { userId },
        include: {
          quiz: {
            select: { title: true, category: { select: { name: true } } },
          },
        },
        orderBy: { completedAt: 'desc' },
      });
    }

    res.json(attempts);
  } catch (error) {
    console.error('Fetch attempts error:', error);
    res.status(500).json({ message: 'Server error fetching quiz attempts' });
  }
};

export const getAttemptById = async (req, res) => {
  try {
    const { id } = req.params;
    const attemptId = parseInt(id, 10);
    const userId = req.user.id;
    const role = req.user.role;

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            passingScore: true,
            category: { select: { name: true } },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        answers: {
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Quiz attempt not found' });
    }

    // Authorization check
    if (role !== 'ADMIN' && attempt.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(attempt);
  } catch (error) {
    console.error('Fetch attempt details error:', error);
    res.status(500).json({ message: 'Server error fetching attempt details' });
  }
};
