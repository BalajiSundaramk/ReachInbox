import { FileUp, Star, X } from 'lucide-react';

export interface BackendEmail {
  id: string;
  recipientEmail?: string | null;
  senderEmail?: string | null;
  subject: string;
  body: string;
  status: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  failedAt?: string | null;
  createdAt?: string | null;
  errorMessage?: string | null;
  previewUrl?: string | null;
}

export function RecipientChip({ email, onRemove }: { email: string; onRemove?: () => void }) {
  return (
    <span className="chip">
      {email}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${email}`}>
          <X size={12} />
        </button>
      )}
    </span>
  );
}

export function FileUpload({ onEmails }: { onEmails: (emails: string[], count: number) => void }) {
  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const matches = raw.match(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi) ?? [];
      const unique = [...new Set(matches.map((e) => e.toLowerCase()))];
      onEmails(unique, unique.length);
    };
    reader.readAsText(file);
  };

  return (
    <label className="upload-label">
      <FileUp size={14} /> Upload List
      <input
        type="file"
        accept=".csv,.txt"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) readFile(file);
          e.target.value = '';
        }}
      />
    </label>
  );
}

function formatTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function EmailRow({ email, onClick }: { email: BackendEmail; onClick?: () => void }) {
  const status = email.status?.toUpperCase();
  const isScheduled = status === 'SCHEDULED' || status === 'PROCESSING';
  const isFailed = status === 'FAILED';
  const label = isScheduled ? 'Scheduled' : isFailed ? 'Failed' : 'Sent';
  const time = isScheduled
    ? formatTime(email.scheduledAt ?? email.createdAt)
    : formatTime(email.sentAt ?? email.failedAt ?? email.createdAt);

  return (
    <div className="email-row" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="row-top">
        <span>To: <b>{email.recipientEmail ?? '—'}</b></span>
        <span style={{ fontSize: '12px', color: '#888' }}>{time}</span>
      </div>
      <b className="subject">{email.subject}</b>
      <p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {email.body}
      </p>
    </div>
  );
}