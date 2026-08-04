import http from 'http';
import { createApp } from './app';
import logger from './utils/logger';
import { PORT, API_PREFIX } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { initNotificationSocket } from './sockets/notification.socket';

async function main(): Promise<void> {
  // 1. Connect infrastructure. MongoDB is required; Redis is best-effort.
  try {
    await connectDatabase();
  } catch (err) {
    logger.error('❌ Failed to connect to MongoDB — exiting', { error: (err as Error).message });
    process.exit(1);
  }
  await connectRedis(); // never throws — degrades to no-cache

  // 2. Build the Express app and wrap it in an HTTP server so Socket.io can
  //    share the same port.
  const app = createApp();
  const server = http.createServer(app);

  // 3. Attach the real-time notification layer.
  initNotificationSocket(server);

  // 4. Start listening.
  server.listen(PORT, () => {
    logger.info('========================================');
    logger.info(`🩺 MedAssist AI backend running on port ${PORT}`);
    logger.info(`🌐 API base:  http://localhost:${PORT}${API_PREFIX}`);
    logger.info(`❤️  Health:    http://localhost:${PORT}/health`);
    logger.info('========================================');
  });

  // 5. Graceful shutdown.
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`🛑 ${signal} received — shutting down gracefully...`);

    server.close(async () => {
      await Promise.allSettled([disconnectDatabase(), disconnectRedis()]);
      logger.info('👋 Shutdown complete');
      process.exit(0);
    });

    // Force-exit if connections don't drain in time.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Last-resort safety nets.
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', {
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    process.exit(1);
  });
}

void main();
