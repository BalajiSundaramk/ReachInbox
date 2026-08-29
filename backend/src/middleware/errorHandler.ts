import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} was not found` });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    const flat = error.flatten();
    // Build a human-readable summary of which fields failed
    const fieldErrors = flat.fieldErrors as Record<string, string[] | undefined>;
    const formErrors = flat.formErrors as string[];
    const messages: string[] = [];
    for (const [field, errs] of Object.entries(fieldErrors)) {
      if (errs && errs.length > 0) messages.push(`${field}: ${errs[0]}`);
    }
    for (const e of formErrors) messages.push(e);
    const summary = messages.length > 0 ? messages.join('; ') : 'Validation failed';
    res.status(400).json({ success: false, message: `Validation failed: ${summary}`, errors: flat });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({ success: false, message: 'Something went wrong' });
};
