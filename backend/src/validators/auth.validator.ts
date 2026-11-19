import { z } from 'zod';

// Registration schema
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email" }),
    password: z.string().min(6, { message: "Password must contain at least 6 characters" }),
    name: z.string().min(2, { message: "Name is required" }).optional(),
  }),
});

// Login schema
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email({ message: "Invalid email" }),
    password: z.string().min(6, { message: "Password must contain at least 6 characters" }),
  }),
});

// Inferred input types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;