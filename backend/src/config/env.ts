import { z } from 'zod';
import dotenv from 'dotenv';

// Load the .env file.
dotenv.config();

// Define required backend configuration.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Apply the string default before converting it to a number.
PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a valid Postgres URL" }),
  JWT_SECRET: z.string().min(8, { message: "JWT_SECRET must contain at least 8 characters" }),
});

// Validate the environment against the schema.
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Environment configuration error:");
  console.error(JSON.stringify(_env.error.format(), null, 2));
  // Stop the server immediately.
  process.exit(1);
}

// Export validated, typed configuration.
export const env = _env.data;