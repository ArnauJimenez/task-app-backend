import { prisma } from '../lib/prisma';

export const analyticsService = {
  async getUserTaskAnalytics(userId: string) {
    const userScope = { userId };
    const [totalTasks, completedTasks] = await Promise.all([
      prisma.task.count({ where: userScope }),
      prisma.task.count({ where: { ...userScope, completed: true } }),
    ]);

    const pendingTasks = totalTasks - completedTasks;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      urgentPendingTasks: null,
      priorityTrackingAvailable: false,
      completionRatePercentage: totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100),
    };
  },
};
