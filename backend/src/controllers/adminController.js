import prisma from '../db.js';

export const getAnalytics = async (req, res) => {
  try {
    // 1. Basic Stats
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalQuizzes = await prisma.quiz.count();
    const publishedQuizzes = await prisma.quiz.count({ where: { status: 'PUBLISHED' } });
    const draftQuizzes = await prisma.quiz.count({ where: { status: 'DRAFT' } });
    const totalQuestions = await prisma.question.count();
    const totalAttempts = await prisma.attempt.count();

    const avgScoreResult = await prisma.attempt.aggregate({
      _avg: { percentage: true },
    });
    const averageScore = avgScoreResult._avg.percentage ? parseFloat(avgScoreResult._avg.percentage.toFixed(1)) : 0;

    const totalPassed = await prisma.attempt.count({ where: { status: 'PASSED' } });
    const totalFailed = await prisma.attempt.count({ where: { status: 'FAILED' } });

    // 2. Quiz performance averages
    const quizzesPerformance = await prisma.quiz.findMany({
      select: {
        id: true,
        title: true,
        attempts: {
          select: { percentage: true },
        },
      },
    });

    const averageQuizScores = quizzesPerformance.map((q) => {
      const attemptsCount = q.attempts.length;
      const avg = attemptsCount > 0
        ? parseFloat((q.attempts.reduce((sum, a) => sum + a.percentage, 0) / attemptsCount).toFixed(1))
        : 0;
      return {
        quizTitle: q.title,
        averageScore: avg,
        attemptsCount,
      };
    });

    // 3. Most Popular Quizzes (by attempts count)
    const popularQuizzes = [...averageQuizScores]
      .sort((a, b) => b.attemptsCount - a.attemptsCount)
      .slice(0, 5);

    // 4. Most Popular Categories (by attempts count)
    const categoriesPerformance = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        quizzes: {
          select: {
            attempts: { select: { id: true } },
          },
        },
      },
    });

    const popularCategories = categoriesPerformance.map((c) => {
      let attemptsCount = 0;
      c.quizzes.forEach((q) => {
        attemptsCount += q.attempts.length;
      });
      return {
        categoryName: c.name,
        attemptsCount,
      };
    }).sort((a, b) => b.attemptsCount - a.attemptsCount).slice(0, 5);

    // 5. Quiz attempts over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attemptsOverTime = await prisma.attempt.findMany({
      where: {
        startedAt: { gte: thirtyDaysAgo },
      },
      select: { startedAt: true },
    });

    // Group by Date string (YYYY-MM-DD)
    const attemptsGrouped = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      attemptsGrouped[dateStr] = 0;
    }

    attemptsOverTime.forEach((a) => {
      const dateStr = a.startedAt.toISOString().split('T')[0];
      if (attemptsGrouped[dateStr] !== undefined) {
        attemptsGrouped[dateStr]++;
      }
    });

    const attemptsChartData = Object.keys(attemptsGrouped).map((date) => ({
      date,
      attempts: attemptsGrouped[date],
    }));

    // 6. Student Registrations over time (last 30 days)
    const registrations = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    });

    const regsGrouped = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      regsGrouped[dateStr] = 0;
    }

    registrations.forEach((r) => {
      const dateStr = r.createdAt.toISOString().split('T')[0];
      if (regsGrouped[dateStr] !== undefined) {
        regsGrouped[dateStr]++;
      }
    });

    const regsChartData = Object.keys(regsGrouped).map((date) => ({
      date,
      registrations: regsGrouped[date],
    }));

    res.json({
      summary: {
        totalStudents,
        totalQuizzes,
        publishedQuizzes,
        draftQuizzes,
        totalQuestions,
        totalAttempts,
        averageScore,
        totalPassed,
        totalFailed,
      },
      charts: {
        attemptsOverTime: attemptsChartData,
        registrationsOverTime: regsChartData,
        averageQuizScores,
        popularQuizzes,
        popularCategories,
        passFailRatio: [
          { name: 'Passed', value: totalPassed },
          { name: 'Failed', value: totalFailed },
        ],
      },
    });
  } catch (error) {
    console.error('Fetch analytics error:', error);
    res.status(500).json({ message: 'Server error generating analytics' });
  }
};
