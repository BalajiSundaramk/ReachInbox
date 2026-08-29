import type { NextFunction, Request as ExpressRequest, Response } from 'express';
import { AppError } from './errorHandler.js';

export function requireAuth(req: ExpressRequest, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  next();
}
