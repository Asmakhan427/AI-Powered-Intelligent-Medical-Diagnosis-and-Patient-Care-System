// ============================================
// Logger - Winston configuration
// --------------------------------------------
// A single shared logger used across services, middleware and sockets.
//   logger.error / warn / info / http / debug
//
// - Development: pretty, colorized console output.
// - Production:  JSON console output (for log shippers) PLUS daily-rotated
//                files under LOG_DIR (error-only + combined), kept 14 days.
// ============================================
import path from 'path';
import winston from 'winston';
import type Transport from 'winston-transport';
import DailyRotateFile from 'winston-daily-rotate-file';
import { IS_PRODUCTION, LOG_LEVEL, LOG_DIR, APP_NAME } from '../config/env';

const { combine, timestamp, printf, colorize, errors, json, splat } = winston.format;

/**
 * Human-readable line format for local development.
 * Appends any structured metadata as compact JSON so `logger.info('x', {a:1})`
 * remains greppable.
 */
const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaKeys = Object.keys(meta).filter((k) => k !== 'service');
  const metaStr = metaKeys.length
    ? ` ${JSON.stringify(Object.fromEntries(metaKeys.map((k) => [k, (meta as Record<string, unknown>)[k]])))}`
    : '';
  return `${ts} [${level}] ${stack || message}${metaStr}`;
});

const transports: Transport[] = [
  new winston.transports.Console({
    format: IS_PRODUCTION
      ? combine(timestamp(), errors({ stack: true }), splat(), json())
      : combine(
          colorize(),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          splat(),
          devFormat
        ),
  }),
];

// Rotated file logs only in production to avoid polluting dev checkouts.
if (IS_PRODUCTION) {
  transports.push(
    new DailyRotateFile({
      dirname: path.resolve(LOG_DIR),
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
    new DailyRotateFile({
      dirname: path.resolve(LOG_DIR),
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
      format: combine(timestamp(), errors({ stack: true }), json()),
    })
  );
}

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: APP_NAME },
  transports,
  // Don't let a logging failure crash the process.
  exitOnError: false,
});

/**
 * Express-style stream so HTTP request loggers (e.g. morgan, if added later)
 * can pipe into Winston at the `http` level.
 */
export const loggerStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

export default logger;
