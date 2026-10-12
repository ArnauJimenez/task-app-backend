import { z } from "zod";

// Validamos directamente el objeto que llega en el req.body
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters long")
    .max(100, "Title cannot exceed 100 characters")
    .trim(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters long")
    .max(100, "Title cannot exceed 100 characters")
    .trim()
    .optional(),
  completed: z
    .boolean()
    .optional(),
});