export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  email?: T;
  emails?: T;
  total?: number;
  message?: string;
  error?: string;
}

export interface SearchResponse<T> {
  success: boolean;
  data: T[];
  total: number;
}

export interface SlackStatusResponse {
  connected: boolean;
  teamId?: string;
  teamName?: string;
  channelId?: string;
  channelName?: string;
}

export interface ScheduleEmailRequest {
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
}

export interface EmailApiRecord {
  id: string;
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  body: string;
  scheduledAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  createdAt: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';
  jobId: string | null;
  previewUrl: string | null;
  errorMessage: string | null;
}
