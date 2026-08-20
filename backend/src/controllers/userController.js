import prisma from '../db.js';

export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        attempts: {
          select: {
            score: true,
            percentage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format students with custom analytics fields
    const formattedUsers = users.map((u) => {
      const attemptsCount = u.attempts.length;
      const scores = u.attempts.map((a) => a.percentage);
      const averageScore = attemptsCount > 0 ? parseFloat((scores.reduce((sum, s) => sum + s, 0) / attemptsCount).toFixed(1)) : 0;
      const highestScore = attemptsCount > 0 ? Math.max(...scores) : 0;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        createdAt: u.createdAt,
        quizzesAttempted: attemptsCount,
        averageScore,
        highestScore,
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Server error fetching user list' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        attempts: {
          include: {
            quiz: {
              select: { title: true },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Omit sensitive information like password
    const { password, ...userInfo } = user;

    res.json(userInfo);
  } catch (error) {
    console.error('Fetch user detail error:', error);
    res.status(500).json({ message: 'Server error fetching user detail' });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = parseInt(id, 10);

    if (!status || !['ACTIVE', 'DEACTIVE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    res.json({ message: `Account has been ${status === 'ACTIVE' ? 'activated' : 'deactivated'}`, user: updatedUser });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error updating user status' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'Student account deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting student' });
  }
};
