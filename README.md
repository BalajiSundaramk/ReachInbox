# ReachInbox

ReachInbox is an email scheduling application. The current repository includes the existing React frontend and a separate Express/Prisma backend foundation.

## Backend setup

### Requirements

- Node.js 20 or later
- A locally running MySQL server
- An existing MySQL user with permission to create and modify the `email_scheduler` database

### Create the database

Connect to your local MySQL server and run:

```sql
CREATE DATABASE email_scheduler;
```

### Configure the environment

Copy `backend/.env.example` to `backend/.env`, then enter your local MySQL password:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/email_scheduler"
PORT=5000
```

MySQL is expected to run locally. Never commit the `.env` file.

### Install and prepare the backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
```

### Run the backend

```bash
npm run dev
```

Test the server at [http://localhost:5000/api/health](http://localhost:5000/api/health). A successful response includes `success: true` and `database: "connected"`.

### Useful commands

```bash
npm run build
npm run prisma:studio
```

## Google OAuth Authentication

ReachInbox uses a secure backend OAuth 2.0 flow with Google authentication. Sessions are managed via HTTP-only cookies instead of frontend token storage.

### Quick Setup

1. **Create Google OAuth credentials** at [Google Cloud Console](https://console.cloud.google.com/):
	- Create a new project or use existing
	- Enable **Google+ API**
	- Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs** (Web application)
	- Set authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
	- Copy your **Client ID** and **Client Secret**

2. **Configure backend/.env:**
	```env
	GOOGLE_CLIENT_ID=your-client-id
	GOOGLE_CLIENT_SECRET=your-client-secret
	GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
	FRONTEND_URL=http://localhost:5173
	SESSION_SECRET=<generate-random-32-char-secret>
	```

3. **Generate SESSION_SECRET:**
	```bash
	node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
	```

4. **Start backend and frontend:**
	```bash
	# Terminal 1
	cd backend && npm run dev
   
	# Terminal 2
	npm run dev
	```

5. **Test login** at [http://localhost:5173/login](http://localhost:5173/login)

### Auth Endpoints

- `GET /api/auth/google` - Start OAuth login (browser redirect)
- `GET /api/auth/google/callback` - OAuth callback (handled automatically)
- `GET /api/auth/me` - Get current user (returns 401 if not authenticated)
- `POST /api/auth/logout` - Logout and destroy session

All protected endpoints require a valid session cookie:
- `POST /api/emails/schedule`
- `GET /api/emails/scheduled`
- `GET /api/emails/sent`
- `GET /api/search`

See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for complete documentation.

The frontend remains at the repository root and is not connected to the API yet.

## Elasticsearch Search

Elasticsearch is an optional search index; MySQL remains the source of truth. Install Elasticsearch locally or run it with Docker:

```bash
docker run --name reachinbox-elasticsearch -p 9200:9200 -e discovery.type=single-node -e xpack.security.enabled=false docker.elastic.co/elasticsearch/elasticsearch:8.19.0
```

Add `ELASTICSEARCH_URL=http://localhost:9200` and `ELASTICSEARCH_INDEX=emails` to `backend/.env`. The backend creates the `emails` index on first use with mappings for recipient/sender email, subject, body, status, dates, and job ID. New emails and every status transition are indexed using the MySQL email ID, so retries update the same document. Indexing is best effort: failures are logged and never change MySQL or interrupt scheduling/sending.

Search with `GET /api/emails/search?q=term&page=1&limit=20`; the response contains `success`, `data`, and `total`. Check availability with `GET /api/search/health`. Existing records are not automatically backfilled; schedule or update them to index them.

## BullMQ Dashboard

The local development dashboard is available at [http://localhost:5000/admin/queues](http://localhost:5000/admin/queues). It uses the existing `email-scheduler` queue and shows waiting, active, delayed, completed, and failed jobs in real time. Schedule an email with a future `scheduledAt`, open the dashboard, and watch that job move through the queue. This endpoint is intentionally an unauthenticated local admin/demo surface; do not expose it publicly.

## Rate Limiting & Throughput

The backend keeps BullMQ delayed jobs in Redis and applies throughput controls when a worker admits a job for sending:

- `WORKER_CONCURRENCY=5` controls concurrent BullMQ processing.
- `MIN_EMAIL_DELAY_MS=2000` reserves a global minimum interval between sends.
- `MAX_EMAILS_PER_HOUR=200` limits admitted send attempts in each UTC hour.

Both controls are configurable in `backend/.env`. The hourly counter uses an expiring Redis key for each UTC hour. Redis Lua scripts atomically reserve hourly capacity and the next global send timestamp, so multiple workers or backend instances cannot pass the same gate concurrently. SMTP failures still consume an admitted hourly attempt because a provider request was made.

When the hourly limit is reached, the existing BullMQ job is moved to the next UTC hour with its job ID and email ID intact. When pacing reserves a future slot, the job is delayed until that slot. These operations do not create new MySQL records or duplicate jobs. Concurrent workers provide throughput while strict ordering remains best effort because jobs can be claimed concurrently.

For 1000+ scheduled emails, Redis and BullMQ retain the delayed jobs; the worker processes them progressively under the two gates rather than creating application timers or loading the whole batch into memory. If Redis is unavailable, the worker fails the job path instead of bypassing throughput controls or falsely marking an email `SENT`.

## Slack Integration

The current scheduler has no real user authentication/session middleware and the Step 4C limiter is global. Slack is therefore installed for the current global scheduler scope until authentication is added; the connection is stored in the `SlackConnection` table and reused across workers.

Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps), enable OAuth & Permissions, add the redirect URL below, and request the `chat:write` scope. Set the client credentials and a channel ID that the installed bot can access in `backend/.env`:

```env
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:5000/api/slack/callback
SLACK_CHANNEL_ID=
SLACK_TOKEN_ENCRYPTION_KEY=
FRONTEND_URL=http://localhost:5173
```

Generate `SLACK_TOKEN_ENCRYPTION_KEY` as 32 random bytes encoded as 64 hexadecimal characters. Start the backend and frontend, then use `Connect Slack` in the dashboard. The backend redirects to Slack, validates a single-use Redis OAuth state on callback, exchanges the authorization code, encrypts the bot token with AES-256-GCM, and redirects back without exposing the token to the browser. `GET /api/slack/status` returns only connection metadata; `POST /api/slack/disconnect` revokes and removes the connection.

When the global hourly email limit is reached, the first worker for that UTC hour atomically claims a Redis notification key and sends one real `chat.postMessage` notification. Other workers reschedule normally without sending duplicates. If Slack is disconnected or unavailable, the email remains correctly rescheduled and the worker continues. No Slack notification is sent for ordinary email sends.
