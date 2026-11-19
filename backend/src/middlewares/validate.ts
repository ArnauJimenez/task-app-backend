import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// 1. Validation schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must contain at least 2 characters').optional(),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must contain at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title cannot be empty').max(255, 'Title is too long'),
});

// 2. Generic request validation middleware
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate and parse the request body.
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Zod validation details are available in .issues.
        res.status(400).json({
          error: 'Invalid input',
          details: error.issues.map((err) => err.message),
        });
        return;
      }
      res.status(500).json({ error: 'Internal validation error' });
    }
  };
};