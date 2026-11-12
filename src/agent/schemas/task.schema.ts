import { z } from 'zod';

export const updateTaskSchema = z.object({
  id: z.string().uuid('El ID de la tarea debe ser un UUID válido')
    .describe('ID único (UUID) de la tarea a actualizar'),
  title: z.string().min(1).max(255).optional()
    .describe('Nuevo título opcional'),
  description: z.string().optional()
    .describe('Nueva descripción opcional'),
  completed: z.boolean().optional()
    .describe('Nuevo estado de completado'),
}).strict().refine(
  (data) => (
    data.title !== undefined
    || data.description !== undefined
    || data.completed !== undefined
  ),
  {
    message: 'Debes proporcionar al menos un campo para actualizar (title, description o completed)',
  },
);
