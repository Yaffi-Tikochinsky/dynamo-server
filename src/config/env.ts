import 'dotenv/config';
import { z } from 'zod';

// All configuration comes from environment variables and is validated once at startup.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${problems}`);
}

export const env = parsed.data;

/** CORS_ORIGIN may be "*" or a comma-separated list of allowed origins. */
export const corsOrigins: string[] | '*' =
  env.CORS_ORIGIN.trim() === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
