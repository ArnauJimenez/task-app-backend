import { ZodError } from 'zod';
import { logger } from '../../config/logger';
import { taskService } from '../../services/task.service';
import { executeCreateTask } from './create-task.tool';
import { executeDeleteTask } from './delete-task.tool';
import { executeUpdateTask } from './update-task.tool';
import {
  agentTools,
  getTasksSchema,
  updateTaskStatusSchema,
} from './definitions';

export type ToolExecutionResult =
  | { success: true; data: unknown; message?: string }
  | { success: false; error: string };

type TaskToolService = Pick<
  typeof taskService,
  'deleteUserTask' | 'getUserTasks' | 'updateUserTask'
>;

function validationError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
    .join('; ');
}

export class ToolExecutor {
  constructor(private readonly tasks: TaskToolService = taskService) {}

  async execute(
    toolName: string,
    rawArgs: unknown,
    userId: string,
  ): Promise<ToolExecutionResult> {
    if (!Object.hasOwn(agentTools, toolName)) {
      return { success: false, error: `Unknown tool name: '${toolName}'` };
    }

    if (!userId.trim()) {
      return { success: false, error: 'An authenticated user is required to execute tools' };
    }

    try {
      switch (toolName) {
        case 'get_tasks': {
          const input = getTasksSchema.parse(rawArgs);
          const tasks = await this.tasks.getUserTasks(userId);
          const search = input.search?.toLocaleLowerCase();
          const filteredTasks = tasks.filter((task) => {
            if (input.status === 'PENDING' && task.completed) return false;
            if (input.status === 'COMPLETED' && !task.completed) return false;
            if (!search) return true;

            return task.title.toLocaleLowerCase().includes(search)
              || task.description?.toLocaleLowerCase().includes(search) === true;
          });
          return { success: true, data: filteredTasks.slice(0, input.limit) };
        }

        case 'create_task': {
          return await executeCreateTask(rawArgs, userId);
        }

        case 'update_task_status': {
          const input = updateTaskStatusSchema.parse(rawArgs);
          const task = await this.tasks.updateUserTask(input.taskId, userId, {
            completed: input.status === 'COMPLETED',
            ...(input.description !== undefined ? { description: input.description } : {}),
          });
          if (!task) {
            return { success: false, error: 'Task not found' };
          }
          return { success: true, data: task };
        }

        case 'update_task': {
          return await executeUpdateTask(rawArgs, userId, this.tasks);
        }

        case 'delete_task': {
          return await executeDeleteTask(rawArgs, userId, this.tasks);
        }

        default:
          return { success: false, error: `Unknown tool name: '${toolName}'` };
      }
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return { success: false, error: `Invalid input: ${validationError(error)}` };
      }
      if (
        error instanceof Error
        && error.message === 'Task not found or does not belong to the authenticated user.'
      ) {
        return { success: false, error: error.message };
      }

      logger.error({ err: error, toolName, userId }, 'Agent tool execution failed');
      return { success: false, error: 'Tool execution failed; please try again' };
    }
  }
}
