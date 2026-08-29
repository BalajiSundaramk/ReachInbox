import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';

const SLACK_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_ACCESS_URL = 'https://slack.com/api/oauth.v2.access';
const SLACK_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';
const SLACK_REVOKE_URL = 'https://slack.com/api/auth.revoke';
const GLOBAL_SCOPE = 'global';

type SlackOAuthResponse = {
  ok: boolean;
  error?: string;
  access_token?: string;
  team?: { id?: string; name?: string };
  incoming_webhook?: { channel_id?: string; channel?: string };
};

export type SlackMessageResponse = {
  ok: boolean;
  channel?: string;
  ts?: string;
  error?: string;
};

function requireSlackConfig(): { clientId: string; clientSecret: string } {
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET || !env.SLACK_TOKEN_ENCRYPTION_KEY) {
    throw new Error('Slack OAuth configuration is incomplete.');
  }
  return { clientId: env.SLACK_CLIENT_ID, clientSecret: env.SLACK_CLIENT_SECRET };
}

function encryptionKey(): Buffer {
  if (!env.SLACK_TOKEN_ENCRYPTION_KEY) throw new Error('Slack token encryption key is not configured.');
  return Buffer.from(env.SLACK_TOKEN_ENCRYPTION_KEY, 'hex');
}

function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptToken(value: string): string {
  const [ivHex, tagHex, encryptedHex] = value.split(':');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
}

export function createSlackState(): string {
  return randomBytes(32).toString('hex');
}

export function getSlackAuthorizationUrl(state: string): string {
  const { clientId } = requireSlackConfig();
  const params = new URLSearchParams({ client_id: clientId, scope: 'chat:write', redirect_uri: env.SLACK_REDIRECT_URI, state });
  return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeSlackCode(code: string): Promise<void> {
  const { clientId, clientSecret } = requireSlackConfig();
  const response = await fetch(SLACK_ACCESS_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: env.SLACK_REDIRECT_URI }),
  });
  const result = (await response.json()) as SlackOAuthResponse;
  if (!response.ok || !result.ok || !result.access_token || !result.team?.id) throw new Error(`Slack OAuth failed: ${result.error ?? 'unknown error'}`);

  await prisma.slackConnection.upsert({
    where: { scopeKey: GLOBAL_SCOPE },
    create: {
      scopeKey: GLOBAL_SCOPE,
      teamId: result.team.id,
      teamName: result.team.name,
      channelId: result.incoming_webhook?.channel_id ?? env.SLACK_CHANNEL_ID,
      channelName: result.incoming_webhook?.channel,
      accessTokenEncrypted: encryptToken(result.access_token),
    },
    update: {
      teamId: result.team.id,
      teamName: result.team.name,
      channelId: result.incoming_webhook?.channel_id ?? env.SLACK_CHANNEL_ID,
      channelName: result.incoming_webhook?.channel,
      accessTokenEncrypted: encryptToken(result.access_token),
    },
  });
}

export async function getSlackConnection() {
  const connection = await prisma.slackConnection.findUnique({ where: { scopeKey: GLOBAL_SCOPE } });
  if (!connection || connection.channelId || !env.SLACK_CHANNEL_ID) return connection;

  return prisma.slackConnection.update({
    where: { id: connection.id },
    data: { channelId: env.SLACK_CHANNEL_ID },
  });
}

export async function sendSlackMessage(text: string): Promise<SlackMessageResponse | null> {
  const connection = await getSlackConnection();
  if (!connection || !connection.channelId) return null;
  const response = await fetch(SLACK_POST_MESSAGE_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${decryptToken(connection.accessTokenEncrypted)}`, 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: connection.channelId, text }),
  });
  const result = (await response.json()) as SlackMessageResponse;
  if (!response.ok || !result.ok) throw new Error(`Slack notification failed: ${result.error ?? 'unknown error'}`);
  return result;
}

export async function disconnectSlack(): Promise<void> {
  const connection = await getSlackConnection();
  if (!connection) return;
  try {
    const { clientId, clientSecret } = requireSlackConfig();
    await fetch(SLACK_REVOKE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: decryptToken(connection.accessTokenEncrypted), client_id: clientId, client_secret: clientSecret }),
    });
  } finally {
    await prisma.slackConnection.delete({ where: { scopeKey: GLOBAL_SCOPE } });
  }
}