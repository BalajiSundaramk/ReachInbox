import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Inbox, Loader2 } from 'lucide-react';

export function Avatar({ label, src, large = false }: { label: string; src?: string; large?: boolean }) {
  const initials = label
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'U';

  if (src) {
    return <img src={src} alt={label} className={`avatar ${large ? 'large' : ''}`} />;
  }

  return <span className={`avatar ${large ? 'large' : ''}`}>{initials}</span>;
}

export function Button({ children, className = '', variant = 'default', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost' | 'danger' }) {
  return <button className={`button ${variant} ${className}`.trim()} {...props}>{children}</button>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'scheduled' | 'sent' | 'failed' | 'warning' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return <div className="state"><Loader2 className="spin" /><span>{message}</span></div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><Inbox size={18} /><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return <div className="error-state"><AlertCircle size={18} /><p>{message}</p>{action}</div>;
}

export function SuccessBanner({ message }: { message: string }) {
  return <div className="toast success"><CheckCircle2 size={16} /> {message}</div>;
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="toast error"><AlertCircle size={16} /> {message}</div>;
}

export function StatPill({ label, value }: { label: string; value: string }) {
  return <div className="stat-pill"><small>{label}</small><strong>{value}</strong></div>;
}

export function TimeBadge({ value }: { value?: string | null }) {
  if (!value) return <Badge tone="neutral">—</Badge>;
  return <Badge tone="scheduled"><Clock3 size={12} /> {value}</Badge>;
}
