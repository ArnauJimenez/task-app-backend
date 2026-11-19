import { z } from 'zod';

// Esquema para el Registro
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Email no válido" }),
    password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
    name: z.string().min(2, { message: "El nombre es obligatorio" }).optional(),
  }),
});

// Esquema para el Login (¡El que faltaba!)
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Email no válido" }),
    password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  }),
});

// Tipos inferidos por si los necesitas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;