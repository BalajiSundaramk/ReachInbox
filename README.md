# ReachInbox

ReachInbox is a full-stack email scheduling application that allows users to compose, send, and schedule emails. It supports immediate sending, scheduled delivery, attachments, email tracking, background processing, rate limiting, search, and integrations.

The project is organized into a separate React frontend and Express/TypeScript backend.

## Features

- Compose and send emails
- Send emails immediately with Send Now
- Schedule emails for a future date and time
- View scheduled emails
- Send scheduled emails immediately
- View sent emails
- Upload email attachments
- Support PDF, images, text, and document attachments
- Email status tracking
- Background email processing
- BullMQ and Redis queue processing
- Email throughput and hourly rate limiting
- Ethereal Email SMTP testing
- Elasticsearch email search
- Google OAuth authentication
- Slack integration for rate-limit notifications
- MySQL database with Prisma ORM

## Technology Stack

### Frontend

- React.js
- TypeScript
- Vite
- Tailwind CSS / modern CSS

### Backend

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- MySQL
- Redis
- BullMQ
- Ethereal Email SMTP
- Elasticsearch
- Slack API
- Google OAuth

## Project Structure

text
ReachInbox/
│
├── .gitignore
├── README.md
├── OAUTH_SETUP.md
├── TESTING_GUIDE.md
├── VERIFICATION_CHECKLIST.md
│
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── index.html
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   └── src/
│
└── backend/
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.json
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    └── src/
        ├── config/
        ├── controllers/
        ├── middleware/
        ├── queues/
        ├── routes/
        ├── services/
        ├── types/
        └── workers/


Setup Instructions
Install Node.js 20+, npm, MySQL, and Redis.
Clone the repository:
git clone https://github.com/BalajiSundaramk/ReachInbox.git
cd ReachInbox
Create the MySQL database:
CREATE DATABASE email_scheduler;
Configure the backend:
cd backend
copy .env.example .env

Open backend/.env and add your MySQL, Redis, and Ethereal Email credentials.

Install and prepare the backend:
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
Start the backend:
npm run dev

Backend runs at http://localhost:5000.

Open a new terminal and configure the frontend:
cd C:\ReachInbox\frontend
npm install
Start the frontend:
npm run dev

Frontend normally runs at http://localhost:5173.

Keep MySQL, Redis, backend, and frontend running.
Open http://localhost:5173 and test Send Now, Send Later, attachments, Scheduled, Sent, Ethereal email preview, and other implemented features.

For detailed setup and configuration information, refer to the respective documentation files provided in the repository.

## Additional Documentation

Detailed information for specific parts of the project is available in the following documentation files:

- **OAUTH_SETUP.md** — Detailed Google OAuth setup, configuration, credentials, redirect URI, and authentication instructions.
- **TESTING_GUIDE.md** — Detailed testing procedures and test cases for the application's features.
- **VERIFICATION_CHECKLIST.md** — Detailed project verification checklist covering functionality, security, builds, and final submission requirements.

For complete details about a specific feature or configuration, refer to the corresponding documentation page above.
