import cors from 'cors';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { RedisStore } from 'connect-redis';
import { env } from './config/env.js';
import { redisConnection } from './config/redis.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/auth.js';
import { healthRouter } from './routes/healthRoutes.js';
import { authRouter } from './routes/auth.routes.js';
import { emailRouter } from './routes/email.routes.js';
import { testRouter } from './routes/test.routes.js';
import { slackRouter } from './routes/slack.routes.js';
import { searchRouter } from './routes/search.routes.js';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/dist/queueAdapters/bullMQ.js';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './queues/email.queue.js';

export const app = express();

// CORS configuration with credentials support
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

// Parse JSON bodies (but let multer handle multipart)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Redis-backed session store — sessions survive server restarts
const sessionStore = new RedisStore({ client: redisConnection, prefix: 'sess:' });

// Session configuration
app.use(
  session({
    store: sessionStore,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/emails', requireAuth, emailRouter);
app.use('/api/test', requireAuth, testRouter);
app.use('/api/slack', slackRouter);
app.use('/api/search', requireAuth, searchRouter);

const bullBoardServerAdapter = new ExpressAdapter();
bullBoardServerAdapter.setBasePath('/admin/queues');
createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter: bullBoardServerAdapter });
app.use('/admin/queues', bullBoardServerAdapter.getRouter());
app.use(notFoundHandler);
app.use(errorHandler);