import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Archive, Clock, Filter, Paperclip, RefreshCw,
  Search, Send, Star, Trash2, X, Calendar,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Bold, Italic, Underline, Undo, Redo,
  MoreHorizontal, Image,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from './components/layout';
import { EmailRow, FileUpload, RecipientChip } from './components/email';
import type { BackendEmail } from './components/email';
import { Avatar, Button, EmptyState, Input, Textarea } from './components/ui';
import { apiClient } from './services/apiClient';
import { authService } from './services/authService';

// --- Google SVG icon --------------------------------------------------------
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.2 0 24 0 14.6 0 6.6 5.5 2.8 13.5l7.9 6.1C12.5 13.3 17.8 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.6 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.1z"/>
      <path fill="#FBBC05" d="M10.7 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.3-3 .7-4.4l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.8 10.7l7.9-6.3z"/>
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.7 2.2-7.6 2.2-6.2 0-11.5-3.8-13.3-9.2l-7.9 6.1C6.6 42.5 14.6 48 24 48z"/>
    </svg>
  );
}

// --- LoginPage ---------------------------------------------------------------
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authService.checkAuth().then((user) => {
      if (user) navigate('/sent', { replace: true });
    });
  }, [navigate]);

  const handleGoogleLogin = () => { authService.loginWithGoogle(); };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setLoginError('');
    try {
      await authService.loginWithEmail(email.trim(), password);
      navigate('/sent', { replace: true });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">R</span>
          ReachInbox
        </div>

        <h1>Welcome<br />back</h1>
        <p className="subtitle">Sign in to continue to ReachInbox</p>

        <button type="button" className="btn-google" onClick={handleGoogleLogin}>
          <GoogleIcon />
          Login with Google
        </button>

        <div className="divider"><span>or continue with email</span></div>

        {loginError && <div className="login-error">{loginError}</div>}

        <form onSubmit={handleEmailLogin}>
          <div className="login-field">
            <label htmlFor="login-email">Email ID</label>
            <Input id="login-email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <Input id="login-password" type="password" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- SentPage ----------------------------------------------------------------
export function SentPage() {
  const [emails, setEmails] = useState<BackendEmail[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<{ success: boolean; emails?: BackendEmail[] }>('/api/emails/sent');
      setEmails(res.emails ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sent emails.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return emails;
    const q = query.toLowerCase();
    return emails.filter((e) => `${e.recipientEmail ?? ''} ${e.subject} ${e.body}`.toLowerCase().includes(q));
  }, [emails, query]);

  return (
    <AppLayout>
      <div className="page-content sent-page">
        <div className="top-bar">
          <div className="search-bar-large">
            <Search size={18} className="search-icon" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search sent emails"
            />
          </div>
          <div className="top-actions">
            <button type="button" onClick={load} aria-label="Refresh"><RefreshCw size={17} /></button>
            <button type="button" aria-label="Filter"><Filter size={17} /></button>
          </div>
        </div>

        <div className="section-header">
          <h1>Sent</h1>
          <span>{filtered.length} email{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="state">Loading...</div>
        ) : error ? (
          <div className="error-banner">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No sent emails" description="Messages you send will appear here once delivered." action={<Link to="/compose"><Button type="button" variant="primary">Compose</Button></Link>} />
        ) : (
          <div className="email-list-flat">
            {filtered.map((email) => (
              <div key={email.id} className="sent-row" onClick={() => window.location.href = `/emails/${email.id}`}>
                <div className="sent-row-main">
                  <span className="sent-to">To: <b>{email.recipientEmail ?? '-'}</b></span>
                  <span className="sent-subject">{email.subject}</span>
                  <span className="sent-preview">- {email.body}</span>
                </div>
                <div className="sent-row-meta">
                  {email.previewUrl && (
                    <a
                      href={email.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ethereal-link"
                      onClick={(e) => e.stopPropagation()}
                      title="View in Ethereal"
                    >
                      Preview
                    </a>
                  )}
                  <span className={`sent-badge ${email.status === 'FAILED' ? 'sent-badge-failed' : ''}`}>
                    {email.status === 'FAILED' ? 'Failed' : 'Sent'}
                  </span>
                  <Star size={15} className="star-icon" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// --- ScheduledPage -----------------------------------------------------------
export function ScheduledPage() {
  const [emails, setEmails] = useState<BackendEmail[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingNow, setSendingNow] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<{ success: boolean; emails?: BackendEmail[] }>('/api/emails/scheduled');
      setEmails(res.emails ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scheduled emails.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSendNow = async (emailId: string) => {
    setSendingNow(emailId);
    try {
      await apiClient.post(`/api/emails/${emailId}/send-now`, {});
      // Refresh the list after successful send
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send immediately.');
    } finally {
      setSendingNow(null);
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return emails;
    const q = query.toLowerCase();
    return emails.filter((e) => `${e.recipientEmail ?? ''} ${e.subject} ${e.body}`.toLowerCase().includes(q));
  }, [emails, query]);

  function formatScheduledTime(value?: string | null): string {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  return (
    <AppLayout>
      <div className="page-content scheduled-page">
        <div className="top-bar">
          <div className="search-bar-large">
            <Search size={18} className="search-icon" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search scheduled emails"
            />
          </div>
          <div className="top-actions">
            <button type="button" onClick={load} aria-label="Refresh"><RefreshCw size={17} /></button>
            <button type="button" aria-label="Filter"><Filter size={17} /></button>
          </div>
        </div>

        <div className="section-header">
          <h1>Scheduled</h1>
          <span>{filtered.length} email{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="state">Loading...</div>
        ) : error ? (
          <div className="error-banner">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No scheduled emails" description="Compose a message and schedule it for later." action={<Link to="/compose"><Button type="button" variant="primary">Compose</Button></Link>} />
        ) : (
          <div className="email-list-flat">
            {filtered.map((email) => (
              <div key={email.id} className="scheduled-row">
                <div className="scheduled-row-main" onClick={() => window.location.href = `/emails/${email.id}`}>
                  <span className="scheduled-to">To: <b>{email.recipientEmail ?? '-'}</b></span>
                  <span className="scheduled-time-badge"><Clock size={12} /> {formatScheduledTime(email.scheduledAt)}</span>
                  <span className="scheduled-subject">{email.subject}</span>
                  <span className="scheduled-preview">- {email.body}</span>
                </div>
                <div className="scheduled-actions">
                  <Button
                    type="button"
                    variant="primary"
                    className="send-now-btn"
                    disabled={sendingNow === email.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendNow(email.id);
                    }}
                  >
                    {sendingNow === email.id ? 'Sending...' : 'Send Now'}
                  </Button>
                  <Star size={15} className="star-icon" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// --- ComposePage -------------------------------------------------------------
function minDatetimeLocal(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

interface UploadedFile {
  id: string;
  filename: string;
  size: number;
}

export function ComposePage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const editorRef = useRef<HTMLDivElement>(null);

  const [sendMode, setSendMode] = useState<'now' | 'later'>('now');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [entry, setEntry] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startTime, setStartTime] = useState(minDatetimeLocal());
  const [delayMs, setDelayMs] = useState('2');
  const [hourlyLimit, setHourlyLimit] = useState('50');
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [scheduleLabel, setScheduleLabel] = useState('');
  const [csvInfo, setCsvInfo] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isValid = recipients.length > 0 && subject.trim() && body.trim();
  const isSendNow = sendMode === 'now';

  const addRecipient = () => {
    const val = entry.trim();
    if (!val) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (recipients.includes(val)) {
      setError('This email is already added.');
      return;
    }
    setRecipients((prev) => [...prev, val]);
    setEntry('');
    setError('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File size must be less than 25MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/emails/attachments/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json() as { success: boolean; message?: string; attachment: { id: string; filename: string; size: number } };

      if (!response.ok) {
        throw new Error(data.message || `Upload failed (HTTP ${response.status})`);
      }

      if (data.success) {
        setUploadedFiles((prev) => [...prev, {
          id: data.attachment.id,
          filename: data.attachment.filename,
          size: data.attachment.size,
        }]);
        setUploadError('');
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }

    // Reset input
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSend = async () => {
    if (!isValid || !user) return;

    // For Send Later, validate datetime
    if (!isSendNow && !startTime) {
      setError('Please select a date and time.');
      return;
    }

    // For Send Later, validate future time
    if (!isSendNow && new Date(startTime) <= new Date()) {
      setError('Start time must be in the future.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const scheduledAt = isSendNow
        ? new Date().toISOString() // Send Now uses current time
        : new Date(startTime).toISOString();

      await Promise.all(
        recipients.map((recipientEmail) =>
          apiClient.post('/api/emails/schedule', {
            recipientEmail,
            senderEmail: user.email,
            subject: subject.trim(),
            body: body.trim(),
            scheduledAt,
            sendNow: isSendNow,
            attachmentIds: uploadedFiles.map((f) => f.id),
          }),
        ),
      );

      const action = isSendNow ? 'sent' : 'scheduled';
      setSuccess(`${recipients.length} email${recipients.length > 1 ? 's' : ''} ${action} successfully!`);
      setTimeout(() => navigate(isSendNow ? '/sent' : '/scheduled'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isSendNow ? 'send' : 'schedule'}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const formatTimeLabel = (dt: string): string => {
    const d = new Date(dt);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === now.toDateString()) return `Today, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const handleScheduleSelect = (slot: string) => {
    if (slot.startsWith('tomorrow')) {
      const match = slot.match(/tomorrow\s*,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i);
      if (match) {
        let hour = parseInt(match[1]);
        const minute = parseInt(match[2]);
        const meridiem = match[3]?.toLowerCase();
        if (meridiem === 'pm' && hour < 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(hour, minute, 0, 0);
        const iso = d.toISOString().slice(0, 16);
        setStartTime(iso);
        setScheduleLabel(formatTimeLabel(iso));
      }
    } else if (slot === 'now') {
      const iso = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
      setStartTime(iso);
      setScheduleLabel('Now');
    } else {
      setStartTime(minDatetimeLocal());
      setScheduleLabel('');
    }
    setShowSchedulePanel(false);
  };

  const displayRecipients = recipients.slice(0, 4);
  const extraCount = recipients.length > 4 ? recipients.length - 4 : 0;

  return (
    <AppLayout>
      <div className="compose-page">
        <div className="compose-toolbar">
          <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <h1>Compose New Email</h1>
          <div className="compose-toolbar-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => document.getElementById('attachment-input')?.click()}
              title="Attachment"
              aria-label="Attachment"
            >
              <Paperclip size={18} />
            </button>
            <button
              type="button"
              className="icon-btn schedule-trigger"
              onClick={() => setShowSchedulePanel(!showSchedulePanel)}
              title="Send Later"
              aria-label="Send Later"
            >
              <Clock size={18} />
            </button>
            <Button type="button" variant="primary" disabled={!isValid || submitting} onClick={handleSend}>
              {submitting ? (isSendNow ? 'Sending...' : 'Scheduling...') : (isSendNow ? 'Send Now' : 'Send')}
            </Button>
          </div>
        </div>

        {showSchedulePanel && (
          <div className="schedule-panel">
            <div className="schedule-panel-header">
              <h3>Send Later</h3>
              <button type="button" className="close-panel" onClick={() => setShowSchedulePanel(false)}><X size={16} /></button>
            </div>
            <div className="schedule-option" onClick={() => { document.getElementById('start-time')?.focus(); setShowSchedulePanel(false); }}>
              <Calendar size={16} />
              <span>Pick date & time</span>
            </div>
            <div className="schedule-presets">
              <button type="button" onClick={() => handleScheduleSelect('now')}>Now</button>
              <button type="button" onClick={() => handleScheduleSelect('tomorrow 10:00 AM')}>Tomorrow, 10:00 AM</button>
              <button type="button" onClick={() => handleScheduleSelect('tomorrow 11:00 AM')}>Tomorrow, 11:00 AM</button>
              <button type="button" onClick={() => handleScheduleSelect('tomorrow 3:00 PM')}>Tomorrow, 3:00 PM</button>
            </div>
          </div>
        )}

        <div className="compose-body">
          <div className="compose-form">
            {error && <div className="error-banner">{error}</div>}
            {success && <div className="success-banner">{success}</div>}

            {/* Send Later datetime input - only shown in Send Later mode */}
            {!isSendNow && (
              <div className="form-row">
                <label>Send At</label>
                <input
                  id="start-time"
                  type="datetime-local"
                  value={startTime}
                  min={minDatetimeLocal()}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setScheduleLabel(formatTimeLabel(e.target.value));
                  }}
                  className="datetime-input"
                />
              </div>
            )}

            <div className="form-row">
              <label>From</label>
              <div className="from-value">{user?.email ?? ''}</div>
            </div>

            <div className="form-row">
              <label>To</label>
              <div className="to-field">
                <div className="recipient-chips-compact">
                  {displayRecipients.map((r) => (
                    <RecipientChip key={r} email={r} onRemove={() => setRecipients((prev) => prev.filter((x) => x !== r))} />
                  ))}
                  {extraCount > 0 && <span className="more-recipients">+{extraCount}</span>}
                </div>
                <input
                  type="email"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }}
                  placeholder="recipient@example.com"
                  className="to-input"
                />
              </div>
              <div className="upload-list-btn">
                <FileUpload onEmails={(list, count) => {
                  const merged = [...new Set([...recipients, ...list])];
                  setRecipients(merged);
                  setCsvInfo(`${count} address${count !== 1 ? 'es' : ''} loaded`);
                }} />
              </div>
            </div>
            {csvInfo && <div className="upload-info">{csvInfo}</div>}

            <div className="form-row">
              <label>Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="subject-input" />
            </div>

            {/* Attachment Upload */}
            <div className="form-row">
              <label>Attachments</label>
              <input
                id="attachment-input"
                type="file"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.gif,.webp,.svg"
              />
              <div className="attachment-upload-area">
                <button
                  type="button"
                  className="attach-btn"
                  onClick={() => document.getElementById('attachment-input')?.click()}
                >
                  <Paperclip size={14} /> Choose Files
                </button>
                {uploadError && <span className="upload-error">{uploadError}</span>}
              </div>
              {uploadedFiles.length > 0 && (
                <div className="attached-files-list">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="attached-file">
                      <span className="file-name">{file.filename}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      <button type="button" className="remove-file" onClick={() => removeFile(file.id)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="delay-limit-row">
              <div className="delay-limit-field">
                <label>Delay between 2 emails</label>
                <input type="number" min="0" value={delayMs} onChange={(e) => setDelayMs(e.target.value)} className="delay-input" />
              </div>
              <div className="delay-limit-field">
                <label>Hourly Limit</label>
                <input type="number" min="1" value={hourlyLimit} onChange={(e) => setHourlyLimit(e.target.value)} className="limit-input" />
              </div>
            </div>

            <div className="editor-wrapper">
              <div className="editor-toolbar">
                <button type="button" onClick={() => execCmd('undo')} title="Undo"><Undo size={15} /></button>
                <button type="button" onClick={() => execCmd('redo')} title="Redo"><Redo size={15} /></button>
                <span className="toolbar-divider" />
                <button type="button" onClick={() => execCmd('bold')} title="Bold"><Bold size={15} /></button>
                <button type="button" onClick={() => execCmd('italic')} title="Italic"><Italic size={15} /></button>
                <button type="button" onClick={() => execCmd('underline')} title="Underline"><Underline size={15} /></button>
                <span className="toolbar-divider" />
                <button type="button" onClick={() => execCmd('justifyLeft')} title="Align Left"><AlignLeft size={15} /></button>
                <button type="button" onClick={() => execCmd('justifyCenter')} title="Align Center"><AlignCenter size={15} /></button>
                <button type="button" onClick={() => execCmd('justifyRight')} title="Align Right"><AlignRight size={15} /></button>
                <button type="button" onClick={() => execCmd('justifyFull')} title="Justify"><AlignJustify size={15} /></button>
                <span className="toolbar-divider" />
                <button type="button" onClick={() => execCmd('insertUnorderedList')} title="Bullet List"><List size={15} /></button>
                <button type="button" onClick={() => execCmd('insertOrderedList')} title="Numbered List"><ListOrdered size={15} /></button>
              </div>
              <div
                ref={editorRef}
                className="rich-editor"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setBody(e.currentTarget.innerText)}
                data-placeholder="Type Your Reply..."
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// --- EmailDetailPage ---------------------------------------------------------
export function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState<BackendEmail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiClient
      .get<{ success: boolean; email?: BackendEmail }>(`/api/emails/${id}`)
      .then((res) => setEmail(res.email ?? null))
      .catch(() => setEmail(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="detail"><div className="state">Loading...</div></div>
      </AppLayout>
    );
  }

  if (!email) {
    return (
      <AppLayout>
        <div className="detail">
          <EmptyState title="Email not found" description="The requested message could not be loaded." action={<Button type="button" onClick={() => navigate('/sent')}>Back to Sent</Button>} />
        </div>
      </AppLayout>
    );
  }

  const timeDisplay = email.sentAt ?? email.scheduledAt ?? email.createdAt ?? '';
  const dateStr = timeDisplay ? new Date(timeDisplay).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const timeStr = timeDisplay ? new Date(timeDisplay).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <AppLayout>
      <div className="detail-page">
        <div className="detail-header">
          <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          <h2 className="detail-title">{email.subject}</h2>
          <div className="detail-actions">
            <Star size={18} />
            <Archive size={18} />
            <Trash2 size={18} />
            <MoreHorizontal size={18} />
          </div>
        </div>

        <div className="detail-content">
          <div className="detail-sender">
            <Avatar label={email.senderEmail?.[0] ?? 'U'} large />
            <div className="sender-info">
              <b>{email.senderEmail ?? 'Unknown'}</b>
              <span>to me</span>
            </div>
            <div className="detail-time">
              <span className="detail-date">{dateStr}</span>
              <span className="detail-hour">{timeStr}</span>
            </div>
          </div>

          <div className="detail-body">
            {email.body.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>

          {email.previewUrl && (
            <div className="attachments-section">
              <p className="attachments-title">Attachments</p>
              <a href={email.previewUrl} target="_blank" rel="noopener noreferrer" className="attachment-card">
                <Image size={24} />
                <span>View in Ethereal</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}