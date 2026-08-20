import prisma from '../db.js';

export const getLeaderboard = async (req, res) => {
  try {
    const { categoryId } = req.query;

    const whereClause = {};

    if (categoryId) {
      whereClause.quiz = {
        categoryId: parseInt(categoryId, 10),
      };
    }

    // Fetch all attempts with user details
    const attempts = await prisma.attempt.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Group attempts by user in JS
    const userStats = {};

    attempts.forEach((a) => {
      const u = a.user;
      if (!u) return;

      if (!userStats[u.id]) {
        userStats[u.id] = {
          userId: u.id,
          name: u.name,
          email: u.email,
          totalScorePercent: 0,
          highestScore: 0,
          completedCount: 0,
        };
      }

      userStats[u.id].totalScorePercent += a.percentage;
      userStats[u.id].completedCount += 1;
      if (a.percentage > userStats[u.id].highestScore) {
        userStats[u.id].highestScore = a.percentage;
      }
    });

    // Convert to array and calculate averages
    const leaderboard = Object.values(userStats).map((u) => {
      const averageScore = u.completedCount > 0
        ? parseFloat((u.totalScorePercent / u.completedCount).toFixed(1))
        : 0;

      return {
        userId: u.userId,
        name: u.name,
        email: u.email,
        averageScore,
        highestScore: u.highestScore,
        completedCount: u.completedCount,
      };
    });

    // Sort by: Average Score descending, then highest score
    leaderboard.sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return b.highestScore - a.highestScore;
    });

    // Assign rank
    const rankedLeaderboard = leaderboard.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    res.json(rankedLeaderboard);
  } catch (error) {
    console.error('Fetch leaderboard error:', error);
    res.status(500).json({ message: 'Server error generating leaderboard' });
  }
};
