import { z, ZodError } from 'zod';
import { badRequest, FieldError } from './errors';
import { isValidDay } from './dates';

/** Turns Zod issues into the API's per-field error list. */
export function zodToFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/** Validates data with a Zod schema. Throws a 400 VALIDATION_ERROR with field details on failure. */
export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest('יש שגיאות בנתונים שנשלחו', zodToFieldErrors(result.error));
  }
  return result.data;
}

/** A "YYYY-MM-DD" calendar date. */
export const dayString = z
  .string({ required_error: 'שדה חובה', invalid_type_error: 'תאריך בפורמט YYYY-MM-DD' })
  .refine(isValidDay, 'תאריך לא תקין, יש להשתמש בפורמט YYYY-MM-DD');

/** Positive integer id taken from the URL. */
export const idParam = z.object({
  id: z.coerce.number({ invalid_type_error: 'מזהה לא תקין' }).int('מזהה לא תקין').positive('מזהה לא תקין'),
});
