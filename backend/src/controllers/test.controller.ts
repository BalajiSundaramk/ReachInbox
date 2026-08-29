import type { RequestHandler } from 'express';
import { z } from 'zod';
import { addTestEmailJob } from '../services/queue.service.js';

const testQueueSchema = z.object({
  emailId: z.string().trim().min(1, 'emailId is required.'),
  delay: z.number().int().min(0, 'delay must be a non-negative integer.'),
});

export const testController: RequestHandler = async (req, res, next) => {
  try {
    const { emailId, delay } = testQueueSchema.parse(req.body);
    const job = await addTestEmailJob(emailId, delay);
    res.status(200).json({ success: true, jobId: job.id });
  } catch (error) {
    next(error);
  }
};
