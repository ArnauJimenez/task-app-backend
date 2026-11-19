import { z } from 'zod';

export const updateTaskSchema = z.object({
  id: z.string().uuid('Task ID must be a valid UUID')
    .describe('Unique ID (UUID) of the task to update'),
  title: z.string().min(1).max(255).optional()
    .describe('Optional new title'),
  description: z.string().optional()
    .describe('Optional new description'),
  completed: z.boolean().optional()
    .describe('New completion status'),
}).strict().refine(
  (data) => (
    data.title !== undefined
    || data.description !== undefined
    || data.completed !== undefined
  ),
  {
    message: 'Provide at least one field to update (title, description, or completed)',
  },
);
