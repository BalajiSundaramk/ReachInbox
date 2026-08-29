import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid database URL.'),
  PORT: z.coerce.number().int().min(1).max(65535),
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required.'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1, 'WORKER_CONCURRENCY must be at least 1.'),
  MIN_EMAIL_DELAY_MS: z.coerce.number().int().min(0).default(2000),
  MAX_EMAILS_PER_HOUR: z.coerce.number().int().min(1).default(200),
  ETHEREAL_HOST: z.string().min(1).optional(),
  ETHEREAL_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  ETHEREAL_USER: z.string().min(1).optional(),
  ETHEREAL_PASSWORD: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
  SLACK_CLIENT_ID: z.string().min(1).optional(),
  SLACK_CLIENT_SECRET: z.string().min(1).optional(),
  SLACK_REDIRECT_URI: z.string().url().default('http://localhost:5000/api/slack/callback'),
  SLACK_CHANNEL_ID: z.string().min(1).optional(),
  SLACK_TOKEN_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/).optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  ELASTICSEARCH_URL: z.string().url().optional(),
  ELASTICSEARCH_INDEX: z.string().min(1).default('emails'),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url().default('http://localhost:5000/api/auth/google/callback'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  DEMO_EMAIL: z.string().email().optional(),
  DEMO_PASSWORD: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration. Check required values in backend/.env.');
  process.exit(1);
}

export const env = parsed.data;
