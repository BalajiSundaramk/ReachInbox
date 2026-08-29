export type EmailStatus = 'scheduled' | 'sent' | 'failed';
export interface Email { id: string; recipient: string; recipientName?: string; subject: string; preview: string; body: string; status: EmailStatus; scheduledAt?: string; sentAt?: string; starred?: boolean; }
