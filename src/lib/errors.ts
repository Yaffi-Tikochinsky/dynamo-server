export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'RULE_VIOLATION'
  | 'MISSING_NOT_CONFIRMED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RESULTS_LOCKED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR';

export interface FieldError {
  field: string;
  message: string;
}

/** An error that is sent to the client as { error: { code, message, details } }. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: FieldError[] | Record<string, unknown>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: FieldError[]) => new AppError(400, 'VALIDATION_ERROR', message, details);
export const ruleViolation = (message: string, details?: FieldError[]) => new AppError(400, 'RULE_VIOLATION', message, details);
export const unauthorized = (message = 'יש להתחבר כדי לבצע פעולה זו') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'אין לך הרשאה לבצע פעולה זו') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (message = 'הפריט לא נמצא', details?: FieldError[]) => new AppError(404, 'NOT_FOUND', message, details);
export const conflict = (message: string, details?: FieldError[]) => new AppError(409, 'CONFLICT', message, details);
