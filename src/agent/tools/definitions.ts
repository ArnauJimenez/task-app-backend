import { z } from 'zod';
import { createTaskSchema } from './create-task.tool';
import { deleteTaskSchema } from './delete-task.tool';
import { updateTaskSchema } from '../schemas/task.schema';

export const getTasksSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED']).optional()
    .describe('Filter tasks by completion status'),
  search: z.string().trim().max(200).optional()
    .describe('Search task titles and descriptions'),
  limit: z.number().int().positive().max(50).optional().default(10)
    .describe('Maximum number of tasks to return (default 10)'),
});

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid('Invalid UUID format for taskId')
    .describe('Unique identifier of the task to update'),
  status: z.enum(['PENDING', 'COMPLETED'])
    .describe('Target task completion status'),
  description: z.string().optional()
    .describe('Optional new description for the task'),
});

export type GetTasksInput = z.input<typeof getTasksSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;

export const agentTools = {
  get_tasks: {
    name: 'get_tasks',
    description: "Fetch the current user's tasks, optionally filtered by status or search.",
    schema: getTasksSchema,
  },
  create_task: {
    name: 'create_task',
    description: 'Create a task for the current user.',
    schema: createTaskSchema,
  },
  update_task_status: {
    name: 'update_task_status',
    description: "Mark one of the current user's tasks pending or completed.",
    schema: updateTaskStatusSchema,
  },
  update_task: {
    name: 'update_task',
    description: "Update at least one of the title, description, or completion status fields of one of the current user's tasks.",
    schema: updateTaskSchema,
  },
  delete_task: {
    name: 'delete_task',
    description: "Delete one of the current user's tasks.",
    schema: deleteTaskSchema,
  },
} as const;

export { createTaskSchema };
export { updateTaskSchema };
export type AgentToolName = keyof typeof agentTools;
