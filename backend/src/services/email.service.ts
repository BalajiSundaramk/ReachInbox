import { randomUUID } from 'node:crypto';
import { EmailStatus, type Email } from '@prisma/client';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { emailQueue } from '../queues/email.queue.js';
import type { EmailResponse, ScheduleEmailRequest } from '../types/email.js';
import { indexEmail } from './elasticsearch.service.js';
import { resolve } from 'node:path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const UPLOAD_DIR = resolve(process.cwd(), 'uploads');
// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function toEmailResponse(email: Email): EmailResponse {
  const {
    id, recipientEmail, senderEmail, subject, body,
    scheduledAt, status, jobId, createdAt, sentAt,
    failedAt, errorMessage, previewUrl,
  } = email;
  return {
    id, recipientEmail, senderEmail, subject, body,
    scheduledAt, status, jobId, createdAt, sentAt,
    failedAt, errorMessage, previewUrl,
  };
}

/**
 * Save uploaded attachment to disk and create database record
 */
export async function saveAttachment(
  emailId: string | null,
  filename: string,
  mimeType: string,
  buffer: Buffer,
): Promise<{ id: string; path: string; size: number }> {
  const id = randomUUID();
  const ext = filename.includes('.') ? filename.split('.').pop() ?? 'bin' : 'bin';
  const safeFilename = `${id}.${ext}`;
  const filePath = resolve(UPLOAD_DIR, safeFilename);

  // Write file to disk
  writeFileSync(filePath, buffer);

  const attachment = await prisma.attachment.create({
    data: {
      id,
      emailId: emailId ?? undefined, // null/undefined = unlinked until email is scheduled
      filename,
      mimeType,
      size: buffer.length,
      path: filePath,
    },
  });

  return { id: attachment.id, path: filePath, size: attachment.size };
}

/**
 * Get all attachments for an email
 */
export async function getEmailAttachments(emailId: string) {
  return prisma.attachment.findMany({
    where: { emailId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Schedule an email for a specific user.
 * userId is always stored so queries can be scoped per-user.
 * If sendNow is true, creates an immediate job with delay=0.
 */
export async function scheduleEmail(input: ScheduleEmailRequest): Promise<Email> {
  const id = randomUUID();
  const jobId = `email-${id}`;

  const email = await prisma.email.create({
    data: {
      id,
      jobId,
      userId: input.userId,
      recipientEmail: input.recipientEmail,
      senderEmail: input.senderEmail,
      subject: input.subject,
      body: input.body,
      scheduledAt: input.scheduledAt,
    },
  });

  // Link pre-uploaded attachments if provided — match on the temp- prefix used during upload
  if (input.attachmentIds && input.attachmentIds.length > 0) {
    await prisma.attachment.updateMany({
      where: { id: { in: input.attachmentIds } },
      data: { emailId: email.id },
    });
  }

  await indexEmail(email);

  const delay = Math.max(0, input.scheduledAt.getTime() - Date.now());
  const isImmediate = input.sendNow === true;

  try {
    const existingJob = await emailQueue.getJob(jobId);
    if (!existingJob) {
      // For sendNow, use delay=0 to process immediately
      // For scheduled, use calculated delay
      const jobDelay = isImmediate ? 0 : delay;
      await emailQueue.add(
        'scheduled-email',
        { emailId: email.id, sendNow: isImmediate },
        { jobId, delay: jobDelay, removeOnComplete: false, removeOnFail: false },
      );
    }
    console.log(`Job added: jobId=${jobId}  delay=${isImmediate ? 0 : delay}ms  sendNow=${isImmediate}`);
    return email;
  } catch (error) {
    await prisma.email.update({
      where: { id: email.id },
      data: {
        status: EmailStatus.FAILED,
        failedAt: new Date(),
        errorMessage: 'Unable to queue scheduled email.',
      },
    });
    console.error(
      'Unable to add scheduled email job:',
      error instanceof Error ? error.message : 'Unknown queue error',
    );
    throw new AppError(503, 'Email scheduling queue is unavailable.');
  }
}

/**
 * Send an email immediately (for Send Now feature).
 * Validates email exists, belongs to user, and hasn't been sent.
 * Creates an immediate BullMQ job with delay=0.
 */
export async function sendNowEmail(emailId: string, userId: string): Promise<Email> {
  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) throw new AppError(404, 'Email not found.');

  // Verify ownership
  if (email.userId && email.userId !== userId) {
    throw new AppError(403, 'Access denied.');
  }

  // Prevent duplicate sends
  if (email.status === EmailStatus.SENT) {
    throw new AppError(400, 'Email has already been sent.');
  }
  if (email.status === EmailStatus.PROCESSING) {
    throw new AppError(400, 'Email is currently being sent.');
  }

  // Update to processing
  const updatedEmail = await prisma.email.update({
    where: { id: emailId, status: { not: EmailStatus.SENT } },
    data: { status: EmailStatus.PROCESSING },
  });

  await indexEmail({ ...updatedEmail, status: EmailStatus.PROCESSING });

  const jobId = `sendnow-${emailId}-${Date.now()}`;

  try {
    const existingJob = await emailQueue.getJob(jobId);
    if (!existingJob) {
      // Create immediate job (delay=0)
      await emailQueue.add(
        'scheduled-email',
        { emailId: updatedEmail.id, sendNow: true },
        { jobId, delay: 0, removeOnComplete: false, removeOnFail: false },
      );
    }
    console.log(`SendNow job queued: jobId=${jobId}  emailId=${emailId}`);
    return updatedEmail;
  } catch (error) {
    // Revert to scheduled status on queue failure
    await prisma.email.update({
      where: { id: emailId },
      data: { status: EmailStatus.SCHEDULED },
    });
    console.error('Unable to queue SendNow job:', error instanceof Error ? error.message : 'Unknown error');
    throw new AppError(503, 'Email queue is unavailable.');
  }
}

/**
 * Return only SCHEDULED/PROCESSING emails owned by this user.
 */
export async function getScheduledEmails(userId: string): Promise<Email[]> {
  return prisma.email.findMany({
    where: {
      userId,
      status: { in: [EmailStatus.SCHEDULED, EmailStatus.PROCESSING] },
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

/**
 * Return only SENT/FAILED emails owned by this user.
 */
export async function getSentEmails(userId: string): Promise<Email[]> {
  return prisma.email.findMany({
    where: {
      userId,
      status: { in: [EmailStatus.SENT, EmailStatus.FAILED] },
    },
    orderBy: { sentAt: 'desc' },
  });
}

/**
 * Fetch a single email — verify it belongs to the requesting user.
 */
export async function getEmailById(id: string, userId: string): Promise<Email> {
  const email = await prisma.email.findUnique({ where: { id } });
  if (!email) throw new AppError(404, 'Email not found.');
  if (email.userId && email.userId !== userId) {
    throw new AppError(403, 'Access denied.');
  }
  return email;
}

/**
 * Read attachment file from disk
 */
export function getAttachmentFile(path: string): Buffer {
  return readFileSync(path);
}