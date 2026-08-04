// ============================================
// MEDASSIST AI - Environment configuration
// --------------------------------------------
// Loads, validates and coerces every environment variable the backend
// depends on, in ONE place. Importing anything from this module first
// runs `dotenv` and then a Zod validation pass, so a misconfigured
// deployment fails fast at boot with a readable message instead of
// surfacing `undefined` deep inside a request handler.
// ============================================
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Plain `import 'dotenv/config'` resolves `.env` relative to
// `process.cwd()`, which is `packages/backend/` when this runs via `npm run
// dev --workspace=packages/backend` (npm sets cwd to the workspace root) —
// not the monorepo root where the single shared `.env` actually lives. That
// silently loaded nothing and left every var on its hardcoded default. Point
// explicitly at the monorepo root's `.env` instead, which works the same way
// whether this runs from source (src/config) or compiled output (dist/config)
// since both sit at the same depth under packages/backend. In containers
// (Docker/CI) where env vars are injected directly and no `.env` file exists,
// this is a harmless no-op — dotenv never overwrites already-set process.env values.
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });


/**
 * Coerces the common truthy/falsey string spellings into a real boolean.
 */
const booleanFromString = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .transform((v) => v === 'true' || v === '1' || v === 'yes');

const envSchema = z.object({
  // ---------- Runtime ----------
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().default('MedAssist AI'),
  API_PREFIX: z.string().default('/api/v1'),

  // ---------- CORS ----------
  // Comma-separated list of allowed origins.
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SOCKET_CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // ---------- MongoDB ----------
  MONGO_URI: z
    .string()
    .min(1, 'MONGO_URI is required')
    .default('mongodb://localhost:27017/medassist_ai'),
  MONGO_MAX_POOL_SIZE: z.coerce.number().int().positive().default(10),
  MONGO_MIN_POOL_SIZE: z.coerce.number().int().nonnegative().default(2),

  // ---------- Redis ----------
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_ENABLED: booleanFromString.default('true'),
  // Default TTL for AI symptom-prediction cache entries (1 hour).
  PREDICTION_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  // ---------- JWT / Auth ----------
  JWT_SECRET: z.string().min(1).default('dev-access-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(1).default('dev-refresh-secret-change-me'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  // ---------- Python AI model bridge ----------
  // 'python' rather than 'python3': the more portable default across a
  // bare Windows install (only python.exe exists; python3.exe is a
  // Microsoft Store stub that errors) and a standard venv (both names
  // typically resolve to the same interpreter there).
  PYTHON_EXECUTABLE: z.string().default('python'),
  PREDICT_SCRIPT_PATH: z.string().default('./ml/predict.py'),

  // ---------- File uploads ----------
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024), // 5 MB

  // ---------- Logging ----------
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_DIR: z.string().default('./logs'),

  // ---------- Emergency ----------
  EMERGENCY_NUMBER: z.string().default('1122'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`❌ Invalid environment configuration:\n${issues}`);
  // Fail fast — the process cannot run safely with bad config.
  process.exit(1);
}

const env = parsed.data;

// In production, refuse to boot with the built-in development secrets.
if (env.NODE_ENV === 'production') {
  const usingDefaultSecret =
    env.JWT_SECRET.includes('change-me') || env.JWT_REFRESH_SECRET.includes('change-me');
  if (usingDefaultSecret) {
    // eslint-disable-next-line no-console
    console.error(
      '❌ Refusing to start in production with default JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET.'
    );
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ */
/* Named exports — import these directly for ergonomics & tree-shaking */
/* e.g. `import { JWT_SECRET, BCRYPT_SALT_ROUNDS } from '../config/env'` */
/* ------------------------------------------------------------------ */

export const NODE_ENV = env.NODE_ENV;
export const IS_PRODUCTION = env.NODE_ENV === 'production';
export const IS_TEST = env.NODE_ENV === 'test';
export const PORT = env.PORT;
export const APP_NAME = env.APP_NAME;
export const API_PREFIX = env.API_PREFIX;

export const CORS_ORIGIN = env.CORS_ORIGIN;
export const SOCKET_CORS_ORIGIN = env.SOCKET_CORS_ORIGIN;

export const MONGO_URI = env.MONGO_URI;
export const MONGO_MAX_POOL_SIZE = env.MONGO_MAX_POOL_SIZE;
export const MONGO_MIN_POOL_SIZE = env.MONGO_MIN_POOL_SIZE;

export const REDIS_URL = env.REDIS_URL;
export const REDIS_ENABLED = env.REDIS_ENABLED;
export const PREDICTION_CACHE_TTL_SECONDS = env.PREDICTION_CACHE_TTL_SECONDS;

export const JWT_SECRET = env.JWT_SECRET;
export const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;
export const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET;
export const JWT_REFRESH_EXPIRES_IN = env.JWT_REFRESH_EXPIRES_IN;
export const BCRYPT_SALT_ROUNDS = env.BCRYPT_SALT_ROUNDS;

export const PYTHON_EXECUTABLE = env.PYTHON_EXECUTABLE;
export const PREDICT_SCRIPT_PATH = env.PREDICT_SCRIPT_PATH;

export const UPLOAD_DIR = env.UPLOAD_DIR;
export const MAX_UPLOAD_BYTES = env.MAX_UPLOAD_BYTES;

export const LOG_LEVEL = env.LOG_LEVEL;
export const LOG_DIR = env.LOG_DIR;

export const EMERGENCY_NUMBER = env.EMERGENCY_NUMBER;

/**
 * CORS origins as a parsed array (comma-separated in the raw env var).
 */
export const CORS_ORIGINS = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
export const SOCKET_CORS_ORIGINS = env.SOCKET_CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export default env;
