import { ZodError } from 'zod';
import { logger } from '../../config/logger';
import { taskService } from '../../services/task.service';
import {
  agentTools,
  createTaskSchema,
  deleteTaskSchema,
  getTasksSchema,
  updateTaskStatusSchema,
} from './definitions';

export type ToolExecutionResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

type TaskToolService = Pick<
  typeof taskService,
  'createTask' | 'deleteUserTask' | 'getUserTasks' | 'updateUserTask'
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
          const input = createTaskSchema.parse(rawArgs);
          const task = await this.tasks.createTask(input.title, input.description, userId);
          return { success: true, data: task };
        }

        case 'update_task_status': {
          const input = updateTaskStatusSchema.parse(rawArgs);
          const task = await this.tasks.updateUserTask(input.taskId, userId, {
            completed: input.status === 'COMPLETED',
          });
          if (!task) {
            return { success: false, error: 'Task not found' };
          }
          return { success: true, data: task };
        }

        case 'delete_task': {
          const input = deleteTaskSchema.parse(rawArgs);
          const deleted = await this.tasks.deleteUserTask(input.taskId, userId);
          if (!deleted) {
            return { success: false, error: 'Task not found' };
          }
          return {
            success: true,
            data: { message: `Task ${input.taskId} deleted successfully` },
          };
        }

        default:
          return { success: false, error: `Unknown tool name: '${toolName}'` };
      }
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return { success: false, error: `Invalid input: ${validationError(error)}` };
      }

      logger.error({ err: error, toolName, userId }, 'Agent tool execution failed');
      return { success: false, error: 'Tool execution failed; please try again' };
    }
  }
}
