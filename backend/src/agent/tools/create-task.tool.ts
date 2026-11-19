import { z } from 'zod';
import { prisma } from '../../lib/prisma';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255)
    .describe('Title for the new task'),
  description: z.string().optional()
    .describe('Optional details for the task'),
}).strict();

export async function executeCreateTask(args: unknown, userId: string) {
  const input = createTaskSchema.parse(args);
  const newTask = await prisma.task.create({
    data: {
      ...input,
      userId,
    },
  });

  return {
    success: true as const,
    message: 'Task created successfully.',
    data: newTask,
  };
}
