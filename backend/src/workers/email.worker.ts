import { DelayedError, Worker } from 'bullmq';
import { EmailStatus } from '@prisma/client';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { redisConnection } from '../config/redis.js';
import { EMAIL_QUEUE_NAME, type EmailJobData } from '../queues/email.queue.js';
import { sendEmail, type AttachmentInput } from '../services/smtp.service.js';
import { getCurrentHourWindow, reserveHourlySlot, reserveSendSlot } from '../services/throughput.service.js';
import { notifyRateLimitReached } from '../services/slack.notification.service.js';
import { indexEmail } from '../services/elasticsearch.service.js';
import { getEmailAttachments, getAttachmentFile } from '../services/email.service.js';

let emailWorker: Worker<EmailJobData> | null = null;

export function startEmailWorker(): Worker<EmailJobData> {
  if (emailWorker) return emailWorker;

  emailWorker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job) => {
      const isSendNow = job.data.sendNow === true;

      if (job.name === 'test-email') {
        console.log('Processing email job:');
        console.log(`jobId: ${job.id}`);
        console.log(`emailId: ${job.data.emailId}`);
        console.log(`sendNow: ${isSendNow}`);
        return;
      }

      let email = await prisma.email.findUnique({ where: { id: job.data.emailId } });
      if (!email) {
        console.log(`Scheduled email not found, skipping: ${job.data.emailId}`);
        return;
      }

      if (email.status === EmailStatus.SENT) {
        console.log('Email already sent, skipping:', email.id);
        return;
      }

      if (email.status === EmailStatus.FAILED && !isSendNow) {
        console.log(`Email is marked failed, skipping: ${email.id}`);
        return;
      }

      // Transition from SCHEDULED to PROCESSING (only if not already PROCESSING)
      if (email.status === EmailStatus.SCHEDULED) {
        const transition = await prisma.email.updateMany({
          where: { id: email.id, status: EmailStatus.SCHEDULED },
          data: { status: EmailStatus.PROCESSING },
        });

        if (transition.count === 0) {
          console.log(`Email is already being processed, skipping: ${email.id}`);
          return;
        }

        // Refresh email data after update
        const updatedEmail = await prisma.email.findUnique({ where: { id: email.id } });
        if (updatedEmail) {
          await indexEmail({ ...updatedEmail, status: EmailStatus.PROCESSING });
        }
      }

      // Rate limiting check (skip for SendNow if already within limits)
      try {
        const hourWindow = getCurrentHourWindow();
        const hasHourlyReservation = job.data.rateLimitWindow === hourWindow.key;

        if (!hasHourlyReservation && !(await reserveHourlySlot(hourWindow))) {
          const scheduledEmail = await prisma.email.update({
            where: { id: email.id },
            data: { status: EmailStatus.SCHEDULED },
          });
          await indexEmail(scheduledEmail);
          console.log(`Rate limit reached: emailId=${email.id}`);
          console.log(`reschedulingAt=${new Date(hourWindow.nextStart).toISOString()}`);
          await job.moveToDelayed(hourWindow.nextStart, job.token);
          await notifyRateLimitReached(hourWindow.key);
          throw new DelayedError();
        }

        const sendSlot = await reserveSendSlot();
        if (sendSlot.waitMs > 0 && !isSendNow) {
          await job.updateData({ ...job.data, rateLimitWindow: hourWindow.key });
          const scheduledEmail = await prisma.email.update({
            where: { id: email.id },
            data: { status: EmailStatus.SCHEDULED },
          });
          await indexEmail(scheduledEmail);
          console.log(`Send slot: emailId=${email.id} reservedFor=${new Date(sendSlot.reservedAt).toISOString()}`);
          await job.moveToDelayed(sendSlot.reservedAt, job.token);
          throw new DelayedError();
        }

        console.log('Processing email job:');
        console.log(`jobId: ${job.id}`);
        console.log(`emailId: ${email.id}`);
        console.log(`sendNow: ${isSendNow}`);

        // Load attachments
        const attachments = await getEmailAttachments(email.id);
        const attachmentInputs: AttachmentInput[] = attachments.map((att) => ({
          filename: att.filename,
          path: att.path,
          contentType: att.mimeType,
        }));

        // Send email with attachments
        const result = await sendEmail({
          to: email.recipientEmail ?? '',
          from: email.senderEmail ?? '',
          subject: email.subject,
          text: email.body,
          attachments: attachmentInputs.length > 0 ? attachmentInputs : undefined,
        });

        const sentEmail = await prisma.email.update({
          where: { id: email.id },
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
            failedAt: null,
            errorMessage: null,
            previewUrl: result.previewUrl || null,
          },
        });
        await indexEmail(sentEmail);

        console.log(`Email sent successfully: ${email.id}`);
        console.log(`Preview URL: ${result.previewUrl}`);
      } catch (error) {
        if (error instanceof DelayedError) throw error;

        const errorMessage = error instanceof Error ? error.message : 'Scheduled email processing failed.';
        const failedEmail = await prisma.email.update({
          where: { id: email.id },
          data: { status: EmailStatus.FAILED, failedAt: new Date(), errorMessage },
        });
        await indexEmail(failedEmail);
        console.error('Email send failed:');
        console.error(`emailId: ${email.id}`);
        console.error(`error: ${errorMessage}`);
        throw error;
      }
    },
    { connection: redisConnection, concurrency: env.WORKER_CONCURRENCY },
  );

  emailWorker.on('completed', (job) => {
    console.log('Email job completed:');
    console.log(`jobId: ${job.id}`);
  });

  emailWorker.on('error', (error) => console.error('BullMQ worker error:', error.message));
  console.log('BullMQ worker started');
  console.log(`Worker concurrency: ${env.WORKER_CONCURRENCY}`);
  return emailWorker;
}

export async function stopEmailWorker(): Promise<void> {
  if (!emailWorker) return;
  await emailWorker.close();
  emailWorker = null;
}