import type { RequestHandler } from 'express';
import { prisma } from '../config/database.js';

export const healthCheck: RequestHandler = async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, message: 'Email Scheduler API is running', database: 'connected' });
  } catch (error) {
    next(error);
  }
};
