import { taskService } from '../../services/task.service';
import { updateTaskSchema } from '../schemas/task.schema';

type TaskUpdateService = Pick<typeof taskService, 'updateUserTask'>;

export async function executeUpdateTask(
  args: unknown,
  userId: string,
  tasks: TaskUpdateService = taskService,
) {
  const input = updateTaskSchema.parse(args);
  if (!userId.trim()) {
    throw new Error('An authenticated user is required to update a task.');
  }

  const { id, ...data } = input;
  const updatedTask = await tasks.updateUserTask(id, userId, data);
  if (!updatedTask) {
    return { success: false as const, error: 'Task not found' };
  }

  return {
    success: true as const,
    message: `Task updated successfully: "${updatedTask.title}"`,
    data: updatedTask,
  };
}
