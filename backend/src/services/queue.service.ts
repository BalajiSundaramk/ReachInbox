import type { Job } from 'bullmq';
import { emailQueue, type EmailJobData } from '../queues/email.queue.js';

export async function addTestEmailJob(emailId: string, delay: number): Promise<Job<EmailJobData>> {
  const jobId = `email-${emailId}`;
  const existingJob = await emailQueue.getJob(jobId);

  if (existingJob) return existingJob;

  const job = await emailQueue.add('test-email', { emailId }, { jobId, delay, removeOnComplete: false });
  console.log('Job added:');
  console.log(`jobId: ${job.id}`);
  console.log(`delay: ${delay}`);
  return job;
}
