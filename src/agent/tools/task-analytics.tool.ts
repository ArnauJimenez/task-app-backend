import { z } from 'zod';
import { analyticsService } from '../../services/analytics.service';

export const getTaskAnalyticsSchema = z.object({}).strict();

type TaskAnalyticsService = Pick<typeof analyticsService, 'getUserTaskAnalytics'>;

export async function executeGetTaskAnalytics(
  args: unknown,
  userId: string,
  analytics: TaskAnalyticsService = analyticsService,
) {
  getTaskAnalyticsSchema.parse(args);

  return {
    success: true as const,
    data: await analytics.getUserTaskAnalytics(userId),
  };
}
