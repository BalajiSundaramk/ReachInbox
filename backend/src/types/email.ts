import type { Email } from '@prisma/client';

export type AttachmentType = {
  id: string;
  emailId: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  createdAt: Date;
};

export type ScheduleEmailRequest = {
  userId: string;
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  sendNow?: boolean; // If true, send immediately (scheduleAt still used as original scheduled time)
  attachmentIds?: string[]; // IDs of pre-uploaded attachments
};

export type EmailResponse = Pick<
  Email,
  | 'id'
  | 'recipientEmail'
  | 'senderEmail'
  | 'subject'
  | 'body'
  | 'scheduledAt'
  | 'status'
  | 'jobId'
  | 'createdAt'
  | 'sentAt'
  | 'failedAt'
  | 'errorMessage'
  | 'previewUrl'
>;

export type EmailWithAttachmentsResponse = EmailResponse & {
  attachments: AttachmentType[];
};

export type ScheduleEmailResponse = { success: true; email: EmailResponse };

export type SendNowResponse = { success: true; email: EmailResponse };

export type UploadAttachmentResponse = {
  success: true;
  attachment: AttachmentType;
};