import { z } from 'zod';
import { taskService } from '../../services/task.service';

export const deleteTaskSchema = z.object({
  id: z.string().uuid('Task ID must be a valid UUID')
    .describe('Unique identifier (UUID) of the task to delete'),
}).strict();

type TaskDeleteService = Pick<typeof taskService, 'deleteUserTask'>;

export async function executeDeleteTask(
  args: unknown,
  authenticatedUserId: string,
  tasks: TaskDeleteService = taskService,
) {
  const { id } = deleteTaskSchema.parse(args);
  if (!authenticatedUserId.trim()) {
    throw new Error('An authenticated user is required to delete a task.');
  }

  const deleted = await tasks.deleteUserTask(id, authenticatedUserId);
  if (!deleted) {
    throw new Error('Task not found or does not belong to the authenticated user.');
  }

  return {
    success: true as const,
    message: 'Task deleted successfully.',
    data: { id },
  };
}
