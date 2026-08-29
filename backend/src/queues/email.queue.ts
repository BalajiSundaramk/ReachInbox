import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export interface EmailJobData {
  emailId: string;
  rateLimitWindow?: string;
  sendNow?: boolean;
}

export const EMAIL_QUEUE_NAME = 'email-scheduler';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
});
