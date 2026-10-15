import { z } from 'zod';
import dotenv from 'dotenv';

// Cargamos el archivo .env
dotenv.config();

// Definimos el esquema de lo que REQUIERE nuestro backend para sobrevivir
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Primero aplicamos el valor por defecto como String, y LUEGO lo transformamos a Number
PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().url({ message: "DATABASE_URL debe ser una URL válida de Postgres" }),
  JWT_SECRET: z.string().min(8, { message: "JWT_SECRET debe tener al menos 8 caracteres" }),
});

// Validamos process.env contra nuestro esquema
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Error de configuración en las variables de entorno:");
  console.error(JSON.stringify(_env.error.format(), null, 2));
  // Apagamos el servidor de inmediato
  process.exit(1);
}

// Exportamos las variables ya validadas y tipadas (PORT ahora será un number automáticamente)
export const env = _env.data;