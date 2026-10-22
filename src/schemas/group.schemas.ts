import { z } from 'zod';
import { LIMITS } from '../lib/constants';

export const updateGroupSchema = z
  .object({
    name: z
      .string({ required_error: 'שדה חובה' })
      .trim()
      .min(LIMITS.groupNameMin, `שם הקבוצה חייב להכיל לפחות ${LIMITS.groupNameMin} תווים`)
      .max(LIMITS.groupNameMax, `שם הקבוצה יכול להכיל עד ${LIMITS.groupNameMax} תווים`),
  })
  .strict();

export const joinCodeSchema = z.discriminatedUnion(
  'mode',
  [
    z.object({ mode: z.literal('random') }).strict(),
    z
      .object({
        mode: z.literal('custom'),
        code: z
          .string({ required_error: 'שדה חובה' })
          .trim()
          .transform((v) => v.toUpperCase())
          .pipe(
            z
              .string()
              .min(LIMITS.joinCodeMin, `הקוד חייב להכיל לפחות ${LIMITS.joinCodeMin} תווים`)
              .max(LIMITS.joinCodeMax, `הקוד יכול להכיל עד ${LIMITS.joinCodeMax} תווים`)
              .regex(/^[A-Z0-9]+$/, 'הקוד יכול להכיל רק אותיות באנגלית וספרות'),
          ),
      })
      .strict(),
  ],
  { errorMap: () => ({ message: 'mode חייב להיות random או custom' }) },
);

export const transferManagerSchema = z
  .object({ userId: z.number({ required_error: 'שדה חובה', invalid_type_error: 'מזהה לא תקין' }).int().positive() })
  .strict();
