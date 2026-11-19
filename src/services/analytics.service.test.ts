import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../lib/prisma';
import { analyticsService } from './analytics.service';

vi.mock('../lib/prisma', () => ({
  prisma: {
    task: {
      count: vi.fn(),
    },
  },
}));

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates task totals and rounded completion rate within the user scope', async () => {
    vi.mocked(prisma.task.count)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2);

    await expect(analyticsService.getUserTaskAnalytics('user-123')).resolves.toEqual({
      totalTasks: 6,
      completedTasks: 2,
      pendingTasks: 4,
      urgentPendingTasks: null,
      priorityTrackingAvailable: false,
      completionRatePercentage: 33,
    });

    expect(prisma.task.count).toHaveBeenNthCalledWith(1, {
      where: { userId: 'user-123' },
    });
    expect(prisma.task.count).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-123', completed: true },
    });
  });

  it('returns zero metrics and a zero completion rate when there are no tasks', async () => {
    vi.mocked(prisma.task.count)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    await expect(analyticsService.getUserTaskAnalytics('user-with-no-tasks')).resolves.toEqual({
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      urgentPendingTasks: null,
      priorityTrackingAvailable: false,
      completionRatePercentage: 0,
    });
  });
});
