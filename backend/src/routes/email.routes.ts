import { Router } from 'express';
import {
  getEmailController,
  handleUpload,
  scheduleEmailController,
  scheduledEmailsController,
  searchEmailsController,
  sendNowController,
  sentEmailsController,
  uploadAttachmentController,
} from '../controllers/email.controller.js';

export const emailRouter = Router();

// Static routes MUST come before dynamic /:id routes to avoid Express matching
// "attachments" or "scheduled" etc. as an :id parameter
emailRouter.post('/schedule', scheduleEmailController);
emailRouter.post('/attachments/upload', handleUpload, uploadAttachmentController);
emailRouter.get('/scheduled', scheduledEmailsController);
emailRouter.get('/sent', sentEmailsController);
emailRouter.get('/search', searchEmailsController);

// Dynamic routes last
emailRouter.post('/:id/send-now', sendNowController);
emailRouter.get('/:id', getEmailController);