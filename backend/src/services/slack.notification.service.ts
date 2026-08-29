import { redisConnection } from '../config/redis.js';
import { env } from '../config/env.js';
import { sendSlackMessage } from './slack.service.js';

export async function notifyRateLimitReached(hourKey: string): Promise<void> {
  try {
    const dedupeKey = `slack:rate-limit-notified:${hourKey}`;
    const acquired = await redisConnection.set(dedupeKey, '1', 'EX', 3700, 'NX');
    if (acquired !== 'OK') return;
    await sendSlackMessage(`ReachInbox rate limit reached.\n\nGlobal hourly limit: ${env.MAX_EMAILS_PER_HOUR}\nCurrent UTC window: ${hourKey.replace('email-throughput:hour:', '')}:00\nEmails are being rescheduled to the next available window.`);
  } catch (error) {
    console.error('Slack rate-limit notification skipped:', error instanceof Error ? error.message : 'Unknown Slack error.');
  }
}