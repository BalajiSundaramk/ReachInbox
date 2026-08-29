import type { Request, RequestHandler, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { redisConnection } from '../config/redis.js';
import { exchangeGoogleCode, findOrCreateUser, findOrCreateDemoUser, getGoogleAuthUrl, getUserById } from '../services/auth.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

const GOOGLE_STATE_TTL = 600; // 10 minutes

export const googleLoginController: RequestHandler = (_req: Request, res: Response) => {
  const state = randomBytes(32).toString('hex');
  redisConnection.setex(`oauth:state:${state}`, GOOGLE_STATE_TTL, '1');
  const authUrl = getGoogleAuthUrl(state);
  res.redirect(authUrl);
};

export const googleCallbackController: RequestHandler = async (req: Request, res: Response, next) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
      throw new AppError(400, 'Missing authorization code or state.');
    }

    const stateExists = await redisConnection.exists(`oauth:state:${state}`);
    if (stateExists === 0) {
      throw new AppError(400, 'Invalid or expired OAuth state.');
    }

    await redisConnection.del(`oauth:state:${state}`);

    const googleProfile = await exchangeGoogleCode(code);
    const user = await findOrCreateUser(googleProfile);

    req.session.userId = user.id;
    req.session.save((err: any) => {
      if (err) {
        next(new AppError(500, 'Unable to establish session.'));
        return;
      }
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`);
    });
  } catch (error) {
    next(error);
  }
};

export const meController: RequestHandler = async (req: Request, res: Response, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logoutController: RequestHandler = (req: Request, res: Response, next) => {
  req.session.destroy((err: any) => {
    if (err) {
      next(new AppError(500, 'Unable to logout.'));
      return;
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
};

export const emailLoginController: RequestHandler = async (req: Request, res: Response, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required.');
    }

    const demoEmail = env.DEMO_EMAIL;
    const demoPassword = env.DEMO_PASSWORD;

    if (!demoEmail || !demoPassword) {
      throw new AppError(503, 'Demo login is not configured on this server.');
    }

    if (email.toLowerCase().trim() !== demoEmail.toLowerCase() || password !== demoPassword) {
      throw new AppError(401, 'Invalid email or password.');
    }

    const user = await findOrCreateDemoUser({ email: demoEmail, name: 'Demo User' });

    req.session.userId = user.id;
    req.session.save((err: any) => {
      if (err) {
        next(new AppError(500, 'Unable to establish session.'));
        return;
      }
      res.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatarUrl },
      });
    });
  } catch (error) {
    next(error);
  }
};
