import nodemailer, { type SendMailOptions, type SentMessageInfo, type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

export type AttachmentInput = {
  filename: string;
  path: string;
  contentType?: string;
};

export type SendEmailInput = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: AttachmentInput[];
};

export type SendEmailResult = {
  info: SentMessageInfo;
  previewUrl: string | false;
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!env.ETHEREAL_HOST || !env.ETHEREAL_PORT || !env.ETHEREAL_USER || !env.ETHEREAL_PASSWORD) {
    throw new Error('Ethereal SMTP configuration is incomplete.');
  }

  transporter ??= nodemailer.createTransport({
    host: env.ETHEREAL_HOST,
    port: env.ETHEREAL_PORT,
    secure: env.ETHEREAL_PORT === 465,
    auth: { user: env.ETHEREAL_USER, pass: env.ETHEREAL_PASSWORD },
  });
  return transporter;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const mailOptions: SendMailOptions = {
      from: input.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    };

    // Add attachments if provided
    if (input.attachments && input.attachments.length > 0) {
      mailOptions.attachments = input.attachments.map((att) => ({
        filename: att.filename,
        path: att.path,
        contentType: att.contentType,
      }));
    }

    const info = await getTransporter().sendMail(mailOptions);
    return { info, previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown SMTP error.';
    throw new Error(`Ethereal SMTP send failed: ${message}`);
  }
}

export async function verifySmtp(): Promise<void> {
  try {
    await getTransporter().verify();
    console.log('Ethereal SMTP configuration verified');
  } catch (error) {
    console.error('Ethereal SMTP unavailable:', error instanceof Error ? error.message : 'Unknown SMTP error.');
  }
}