import { env } from '../config/env.js';
import { redisConnection } from '../config/redis.js';

const SEND_NEXT_AVAILABLE_KEY = 'email-throughput:send-next-available';
const HOURLY_KEY_PREFIX = 'email-throughput:hour:';
const HOURLY_KEY_TTL_SECONDS = 2 * 60 * 60;

const reserveHourlySlotScript = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[2])
  end
  if count <= tonumber(ARGV[1]) then
    return 1
  end
  redis.call('DECR', KEYS[1])
  return 0
`;

const reserveSendSlotScript = `
  local now = tonumber(ARGV[1])
  local interval = tonumber(ARGV[2])
  local nextAvailable = tonumber(redis.call('GET', KEYS[1])) or 0
  local slot = math.max(now, nextAvailable)
  redis.call('SET', KEYS[1], slot + interval)
  return slot
`;

export type HourWindow = {
  key: string;
  nextStart: number;
};

export type SendSlot = {
  reservedAt: number;
  waitMs: number;
};

export function getCurrentHourWindow(now = new Date()): HourWindow {
  const start = new Date(now);
  start.setUTCMinutes(0, 0, 0);
  const nextStart = new Date(start);
  nextStart.setUTCHours(nextStart.getUTCHours() + 1);
  return { key: `${HOURLY_KEY_PREFIX}${start.toISOString().slice(0, 13)}`, nextStart: nextStart.getTime() };
}

export async function reserveHourlySlot(window = getCurrentHourWindow()): Promise<boolean> {
  const result = await redisConnection.eval(reserveHourlySlotScript, 1, window.key, env.MAX_EMAILS_PER_HOUR, HOURLY_KEY_TTL_SECONDS);
  return Number(result) === 1;
}

export async function reserveSendSlot(now = Date.now()): Promise<SendSlot> {
  const result = await redisConnection.eval(reserveSendSlotScript, 1, SEND_NEXT_AVAILABLE_KEY, now, env.MIN_EMAIL_DELAY_MS);
  const reservedAt = Number(result);
  return { reservedAt, waitMs: Math.max(0, reservedAt - now) };
}