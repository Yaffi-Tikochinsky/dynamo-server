import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { zodToFieldErrors } from '../lib/validation';
import { env } from '../config/env';

/** Unknown URL under /api. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `הכתובת ${req.method} ${req.originalUrl} לא קיימת` } });
}

/** Turns every error into the uniform JSON error shape. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'יש שגיאות בנתונים שנשלחו', details: zodToFieldErrors(err) } });
    return;
  }
  // Body that is not valid JSON
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'גוף הבקשה אינו JSON תקין' } });
    return;
  }
  // Unique constraint violation that slipped past the service checks (e.g. two requests at once)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'הפריט כבר קיים' } });
    return;
  }

  if (env.NODE_ENV !== 'test') console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'שגיאה בשרת, נסו שוב מאוחר יותר' } });
}
