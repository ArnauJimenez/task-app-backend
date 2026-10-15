import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// 1. Definición de los esquemas de validación
export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  email: z.string().email('El formato del correo electrónico es inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const loginSchema = z.object({
  email: z.string().email('El formato del correo electrónico es inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, 'El título de la tarea no puede estar vacío').max(255, 'El título es demasiado largo'),
});

// 2. Middleware genérico para validar peticiones con Zod
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Valida y parsea el body de la petición
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Usamos .issues en lugar de .errors
        res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: error.issues.map((err) => err.message),
        });
        return;
      }
      res.status(500).json({ error: 'Error interno de validación' });
    }
  };
};