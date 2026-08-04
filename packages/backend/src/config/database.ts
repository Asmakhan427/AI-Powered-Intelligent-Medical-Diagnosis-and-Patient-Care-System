// ============================================
// MEDASSIST AI - MongoDB (Mongoose) connection
// --------------------------------------------
// Owns the single Mongoose connection lifecycle: connect (with pooling),
// health/state helpers, connection-event logging and graceful shutdown.
//
// NOTE: the legacy PostgreSQL pool still lives in `./db.ts` while controllers
// are migrated over. New data access should go through Mongoose models.
// ============================================
import mongoose from 'mongoose';
import logger from '../utils/logger';
import { MONGO_URI, MONGO_MAX_POOL_SIZE, MONGO_MIN_POOL_SIZE, IS_PRODUCTION } from './env';

// Strict query filters — silently ignore fields not in the schema instead of
// throwing, matching Mongoose 7+ default but set explicitly for clarity.
mongoose.set('strictQuery', true);

let isConnected = false;

/**
 * Establishes the Mongoose connection. Idempotent: safe to call more than
 * once (returns the existing connection if already connected).
 */
export async function connectDatabase(): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('✅ MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: (err as Error).message });
  });
  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('⚠️  MongoDB disconnected');
  });

  await mongoose.connect(MONGO_URI, {
    maxPoolSize: MONGO_MAX_POOL_SIZE,
    minPoolSize: MONGO_MIN_POOL_SIZE,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    // Build indexes automatically in dev; disable in prod where migrations
    // should manage them to avoid blocking startup on large collections.
    autoIndex: !IS_PRODUCTION,
  });

  isConnected = true;
  return mongoose;
}

/**
 * Closes the Mongoose connection. Used by the graceful-shutdown handler.
 */
export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB connection closed');
}

/**
 * Lightweight readiness probe for health checks.
 * 1 === connected (see mongoose.ConnectionStates).
 */
export function isDatabaseHealthy(): boolean {
  return mongoose.connection.readyState === 1;
}

export { mongoose };
export default connectDatabase;
