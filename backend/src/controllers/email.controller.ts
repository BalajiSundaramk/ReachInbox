import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import multer from 'multer';
import {
  getEmailById,
  getScheduledEmails,
  getSentEmails,
  saveAttachment,
  scheduleEmail,
  sendNowEmail,
  toEmailResponse,
} from '../services/email.service.js';
import { searchEmails } from '../services/elasticsearch.service.js';
import { AppError } from '../middleware/errorHandler.js';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max per file
    files: 10, // max 10 files
  },
  fileFilter: (_req, file, cb) => {
    // Reject executable files only — allow all normal document/image/archive types
    const forbidden = /\.(exe|bat|cmd|sh|php|pl|cgi|jar)$/i;
    if (forbidden.test(file.originalname)) {
      cb(new Error(`File type not allowed: ${file.originalname}`));
      return;
    }
    cb(null, true);
  },
});

// Wrap multer so its errors are returned as JSON (not Express default error HTML)
function handleUpload(req: Request, res: any, next: any) {
  upload.single('file')(req as any, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ success: false, message: `Upload failed: ${err.message}` });
      return;
    }
    if (err) {
      res.status(400).json({ success: false, message: err.message || 'Upload failed' });
      return;
    }
    next();
  });
}

// Validation schemas
// Base schema without cross-field validation
const scheduleEmailBaseSchema = z.object({
  recipientEmail: z.string().trim().email('recipientEmail must be a valid email address.'),
  senderEmail: z.string().trim().email('senderEmail must be a valid email address.'),
  subject: z.string().trim().min(1, 'subject is required.').max(255, 'subject must be at most 255 characters.'),
  body: z.string().trim().min(1, 'body is required.'),
  scheduledAt: z
    .string()
    .datetime({ offset: true, message: 'scheduledAt must be a valid ISO 8601 datetime with timezone offset.' })
    .transform((v) => new Date(v)),
  sendNow: z.boolean().optional().default(false),
  attachmentIds: z.array(z.string().uuid('Each attachmentId must be a valid UUID.')).optional(),
});

// Apply future-time check only when sendNow is false
const scheduleEmailSchema = scheduleEmailBaseSchema.superRefine((data, ctx) => {
  if (!data.sendNow && data.scheduledAt.getTime() <= Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['scheduledAt'],
      message: 'scheduledAt must be in the future when not using Send Now.',
    });
  }
});

const emailIdSchema = z.string().uuid('Email ID must be a valid UUID.');

const searchSchema = z.object({
  q: z.string().trim().default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** POST /api/attachments/upload - Upload a single attachment */
export const uploadAttachmentController: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) throw new AppError(401, 'Authentication required.');

    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { originalname, mimetype, buffer } = file;
    // Save with no emailId yet — it will be linked when the email is scheduled
    const attachment = await saveAttachment(null, originalname, mimetype, buffer);

    res.json({
      success: true,
      attachment: {
        id: attachment.id,
        filename: originalname,
        mimeType: mimetype,
        size: attachment.size,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/emails/schedule */
export const scheduleEmailController: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) throw new AppError(401, 'Authentication required.');

    const parsed = scheduleEmailSchema.parse(req.body);
    const email = await scheduleEmail({ userId, ...parsed });
    res.status(201).json({ success: true, email: toEmailResponse(email) });
  } catch (error) {
    next(error);
  }
};

/** POST /api/emails/:id/send-now - Send a scheduled email immediately */
export const sendNowController: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) throw new AppError(401, 'Authentication required.');

    const id = emailIdSchema.parse(req.params.id);
    const email = await sendNowEmail(id, userId);
    res.json({ success: true, email: toEmailResponse(email) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/emails/scheduled */
export const scheduledEmailsController: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) throw new AppError(401, 'Authentication required.');

    const emails = await getScheduledEmails(userId);
    res.json({ success: true, emails: emails.map(toEmailResponse) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/emails/sent */
export const sentEmailsController: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) throw new AppError(401, 'Authentication required.');

    const emails = await getSentEmails(userId);
    res.json({ success: true, emails: emails.map(toEmailResponse) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/emails/:id */
export const getEmailController: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) throw new AppError(401, 'Authentication required.');

    const id = emailIdSchema.parse(req.params.id);
    const email = await getEmailById(id, userId);
    res.json({ success: true, email: toEmailResponse(email) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/emails/search */
export const searchEmailsController: RequestHandler = async (req, res, next) => {
  try {
    const { q, page, limit } = searchSchema.parse(req.query);
    const result = await searchEmails(q, (page - 1) * limit, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export { upload, handleUpload };