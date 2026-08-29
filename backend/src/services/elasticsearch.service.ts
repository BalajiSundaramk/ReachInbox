import { Client } from '@elastic/elasticsearch';
import type { Email } from '@prisma/client';
import { env } from '../config/env.js';

const client = env.ELASTICSEARCH_URL ? new Client({ node: env.ELASTICSEARCH_URL }) : null;
let indexReady: Promise<void> | null = null;

const emailMapping = {
  properties: {
    id: { type: 'keyword' as const },
    email: { type: 'text' as const, fields: { keyword: { type: 'keyword' as const } } },
    recipientEmail: { type: 'text' as const, fields: { keyword: { type: 'keyword' as const } } },
    sender: { type: 'text' as const, fields: { keyword: { type: 'keyword' as const } } },
    senderEmail: { type: 'text' as const, fields: { keyword: { type: 'keyword' as const } } },
    subject: { type: 'text' as const },
    body: { type: 'text' as const },
    status: { type: 'keyword' as const },
    scheduledAt: { type: 'date' as const },
    sentAt: { type: 'date' as const },
    failedAt: { type: 'date' as const },
    createdAt: { type: 'date' as const },
    jobId: { type: 'keyword' as const },
  },
} as const;

async function ensureIndex(): Promise<void> {
  if (!client) throw new Error('Elasticsearch is not configured.');
  if (!indexReady) {
    indexReady = (async () => {
      const exists = await client.indices.exists({ index: env.ELASTICSEARCH_INDEX });
      if (!exists) await client.indices.create({ index: env.ELASTICSEARCH_INDEX, mappings: emailMapping });
    })().catch((error) => {
      indexReady = null;
      throw error;
    });
  }
  await indexReady;
}

function emailDocument(email: Email) {
  return {
    id: email.id,
    email: email.recipientEmail,
    recipientEmail: email.recipientEmail,
    sender: email.senderEmail,
    senderEmail: email.senderEmail,
    subject: email.subject,
    body: email.body,
    status: email.status,
    scheduledAt: email.scheduledAt,
    sentAt: email.sentAt,
    failedAt: email.failedAt,
    createdAt: email.createdAt,
    jobId: email.jobId,
  };
}

export async function indexEmail(email: Email): Promise<void> {
  try {
    await ensureIndex();
    await client!.index({ index: env.ELASTICSEARCH_INDEX, id: email.id, document: emailDocument(email), refresh: 'wait_for' });
  } catch (error) {
    console.error('Elasticsearch email indexing failed:', error instanceof Error ? error.message : 'Unknown Elasticsearch error');
  }
}

export async function searchEmails(query: string, from: number, size: number) {
  if (!client) {
    return { data: [], total: 0 };
  }

  try {
    await ensureIndex();
    const response = await client.search({
      index: env.ELASTICSEARCH_INDEX,
      from,
      size,
      query: query ? { multi_match: { query, fields: ['email', 'recipientEmail', 'sender', 'senderEmail', 'subject', 'body'] } } : { match_all: {} },
      sort: [{ createdAt: 'desc' }],
    });
    const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;
    return { data: response.hits.hits.map((hit: any) => hit._source), total };
  } catch (error) {
    console.error('Elasticsearch search failed:', error instanceof Error ? error.message : 'Unknown Elasticsearch error');
    return { data: [], total: 0 };
  }
}

export async function checkElasticsearchHealth(): Promise<boolean> {
  if (!client) return false;
  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}