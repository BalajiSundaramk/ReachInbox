# ReachInbox OAuth 2.0 Setup Guide

## Overview

ReachInbox now uses a **secure backend OAuth 2.0 flow** with Google authentication. Instead of storing authentication tokens in the frontend, the application uses **HTTP-only cookies** with session management for maximum security.

## Architecture

### Authentication Flow

```
Browser → GET /api/auth/google (backend initiates OAuth)
         ↓
       (Redirect to Google consent screen)
         ↓
Google → POST /api/auth/google/callback (with authorization code)
         ↓
Backend validates code, creates session, sets HttpOnly cookie
         ↓
Browser → GET /api/auth/me (verify session, get user info)
         ↓
Dashboard loads with authenticated session
```

### Session Management

- **Storage**: Secure HTTP-only cookies (not localStorage)
- **Duration**: 24 hours (configurable via SESSION_SECRET)
- **Attributes**:
  - `HttpOnly`: Prevents JavaScript access (CSRF protection)
  - `SameSite=Lax`: Prevents cross-site cookie submission
  - `Secure`: Only transmitted over HTTPS (production only)

## Google OAuth Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **Google+ API**:
   - Search for "Google+ API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. In Google Cloud Console, go to **Credentials**
2. Click **"+ Create Credentials"** → **"OAuth 2.0 Client IDs"**
3. Choose **Application type**: "Web application"
4. Configure:
   - **Name**: "ReachInbox"
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (development frontend)
     - `https://yourdomain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:5000/api/auth/google/callback` (development backend)
     - `https://yourdomain.com/api/auth/google/callback` (production)
5. Click "Create" and copy the credentials

### 3. Configure Backend Environment

In `backend/.env`:

```env
GOOGLE_CLIENT_ID=<your-client-id-from-google>
GOOGLE_CLIENT_SECRET=<your-client-secret-from-google>
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your_session_secret_min_32_chars_long_12345678
```

#### Generating SESSION_SECRET

Generate a secure random 32+ character string:

**On Linux/macOS:**
```bash
openssl rand -hex 32
```

**On Windows PowerShell:**
```powershell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

**Or use Node.js:**
```javascript
require('crypto').randomBytes(32).toString('hex')
```

## Running the Application

### Development

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Runs on http://localhost:5173
```

### Testing the Auth Flow

1. Visit `http://localhost:5173/login`
2. Click "Login with Google"
3. You'll be redirected to:
   - Google consent screen (choose your account)
   - Back to `http://localhost:5173/dashboard`
4. Session cookie is automatically set (check DevTools → Storage → Cookies)

### Verify Session

**Check current user:**
```bash
curl -b cookies.txt http://localhost:5000/api/auth/me
```

**Logout:**
```bash
curl -X POST -b cookies.txt http://localhost:5000/api/auth/logout
```

## API Endpoints

### POST `/api/auth/google`
Initiates Google OAuth flow.

**Response:** Redirects to Google consent screen

**Example:**
```javascript
window.location.href = 'http://localhost:5000/api/auth/google';
```

### GET `/api/auth/google/callback`
Handles Google OAuth callback (automatically called by Google).

**Query Parameters:**
- `code`: Authorization code from Google
- `state`: CSRF protection token

**Response:** Redirects to `/dashboard` with session cookie set

### GET `/api/auth/me`
Returns current authenticated user.

**Headers:**
```http
Cookie: connect.sid=<session_id>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://..."
  }
}
```

**Status Codes:**
- `200`: Authenticated
- `401`: Not authenticated

### POST `/api/auth/logout`
Destroys the session and clears cookies.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Protected Endpoints

The following API routes require authentication (401 if not authenticated):

- `GET /api/emails/scheduled` - List scheduled emails
- `GET /api/emails/sent` - List sent emails
- `POST /api/emails/schedule` - Schedule new email
- `GET /api/emails/:id` - Get email details
- `GET /api/search` - Search emails
- `POST /api/test/send` - Send test email

**Non-protected endpoints:**
- `GET /api/health` - Health check
- `GET /api/auth/google` - OAuth login
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/slack/status` - Slack connection status

## Frontend Integration

The frontend automatically:

1. **On app load** (`App.tsx`): Calls `GET /api/auth/me` to verify session
2. **On login** (`pages.tsx`): Redirects to `GET /api/auth/google`
3. **On protected routes** (`App.tsx`): Uses `requireAuth()` middleware
4. **On logout** (`authService.ts`): Calls `POST /api/auth/logout`

### Auth Service API

```javascript
// Get current user (from session)
const user = await authService.checkAuth();

// Start login flow
authService.login(); // Redirects to Google

// Logout
await authService.logout();
```

## Security Features

✅ **HTTP-Only Cookies**: Tokens not accessible via JavaScript
✅ **CSRF Protection**: State tokens validated, single-use
✅ **SameSite Cookies**: Prevents cross-site cookie submission
✅ **Session Timeout**: 24-hour expiration
✅ **No Client Secret Exposure**: All OAuth handled server-side
✅ **CORS with Credentials**: Only frontend domain allowed

## Troubleshooting

### "Invalid Google ID token"
- Check GOOGLE_CLIENT_ID is correct
- Verify redirect URI matches Google Console configuration
- Ensure token hasn't expired

### "Invalid or expired OAuth state"
- State tokens expire after 10 minutes
- Browser must have cookies enabled
- Check Redis is running (stores state tokens)

### "Not authenticated" (401) on protected routes
- Session cookie not set or expired
- Check cookie SameSite/Secure settings
- Frontend and backend must use same domain (or SameSite=None + Secure in production)

### Session lost on page refresh
- Cookies might be disabled
- Check SameSite cookie settings
- Verify FRONTEND_URL matches actual frontend URL

## Production Deployment

### Environment Variables

```env
GOOGLE_CLIENT_ID=prod-client-id
GOOGLE_CLIENT_SECRET=prod-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
FRONTEND_URL=https://yourdomain.com
SESSION_SECRET=<generate-new-32-char-secret>
NODE_ENV=production
```

### SSL/TLS

- Ensure backend runs on HTTPS
- Update `GOOGLE_REDIRECT_URI` to `https://`
- Cookies will automatically set `Secure` flag

### CORS Configuration

Update `backend/src/app.ts`:
```typescript
app.use(cors({ 
  origin: 'https://yourdomain.com',  // Change from FRONTEND_URL env var
  credentials: true 
}));
```

## Database

No database migrations required. The `User` model already includes:
- `googleId`: Stores Google's user ID
- `email`: Unique email address
- `name`, `avatarUrl`, timestamps

## Testing with cURL

```bash
# 1. Start login (get redirect URL)
curl -v http://localhost:5000/api/auth/google 2>&1 | grep Location

# 2. After manual Google auth, check session
curl -c cookies.txt http://localhost:5000/api/auth/me

# 3. Verify authentication works
curl -b cookies.txt http://localhost:5000/api/emails/scheduled

# 4. Logout
curl -X POST -b cookies.txt http://localhost:5000/api/auth/logout
```

## Next Steps

1. ✅ Set up Google OAuth credentials
2. ✅ Configure `backend/.env` with credentials
3. ✅ Start backend: `npm run dev`
4. ✅ Start frontend: `npm run dev`
5. ✅ Test login flow
6. ✅ Verify protected routes require authentication

For more information, see the main [README.md](./README.md).
