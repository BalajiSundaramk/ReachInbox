import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { verifySmtp } from './services/smtp.service.js';
import { startEmailWorker, stopEmailWorker } from './workers/email.worker.js';

async function start(): Promise<void> {
  try {
    await connectDatabase();
    await connectRedis();
    await verifySmtp();
    startEmailWorker();
    const server = app.listen(env.PORT, () => console.log(`Email Scheduler API listening on port ${env.PORT}`));

    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down gracefully.`);
      server.close(async () => {
        await disconnectDatabase();
        await stopEmailWorker();
        await disconnectRedis();
        process.exit(0);
      });
    };

    process.once('SIGINT', () => void shutdown('SIGINT'));
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    console.error('Unable to connect to the database. Verify DATABASE_URL in backend/.env.');
    await disconnectDatabase();
    process.exit(1);
  }
}

void start();
