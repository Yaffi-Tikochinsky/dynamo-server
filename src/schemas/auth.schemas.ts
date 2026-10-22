import { z } from 'zod';
import { Avatar } from '@prisma/client';
import { LIMITS } from '../lib/constants';

const username = z
  .string({ required_error: 'שדה חובה' })
  .trim()
  .min(LIMITS.usernameMin, `שם המשתמש חייב להכיל לפחות ${LIMITS.usernameMin} תווים`)
  .max(LIMITS.usernameMax, `שם המשתמש יכול להכיל עד ${LIMITS.usernameMax} תווים`)
  .regex(/^[A-Za-z0-9_]+$/, 'שם המשתמש יכול להכיל רק אותיות באנגלית, ספרות וקו תחתון')
  .transform((v) => v.toLowerCase());

export const registerSchema = z
  .object({
    username,
    password: z
      .string({ required_error: 'שדה חובה' })
      .min(LIMITS.passwordMin, `הסיסמה חייבת להכיל לפחות ${LIMITS.passwordMin} תווים`)
      .max(LIMITS.passwordMax, `הסיסמה יכולה להכיל עד ${LIMITS.passwordMax} תווים`)
      .regex(/[A-Za-z]/, 'הסיסמה חייבת להכיל לפחות אות אחת באנגלית')
      .regex(/[0-9]/, 'הסיסמה חייבת להכיל לפחות ספרה אחת'),
    displayName: z
      .string({ required_error: 'שדה חובה' })
      .trim()
      .min(LIMITS.displayNameMin, `שם התצוגה חייב להכיל לפחות ${LIMITS.displayNameMin} תווים`)
      .max(LIMITS.displayNameMax, `שם התצוגה יכול להכיל עד ${LIMITS.displayNameMax} תווים`),
    avatar: z.nativeEnum(Avatar, { errorMap: () => ({ message: 'יש לבחור אווטאר מהרשימה' }) }),
    joinCode: z.string().trim().min(1, 'יש להזין קוד הצטרפות').optional(),
    groupName: z
      .string()
      .trim()
      .min(LIMITS.groupNameMin, `שם הקבוצה חייב להכיל לפחות ${LIMITS.groupNameMin} תווים`)
      .max(LIMITS.groupNameMax, `שם הקבוצה יכול להכיל עד ${LIMITS.groupNameMax} תווים`)
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasCode = data.joinCode !== undefined;
    const hasName = data.groupName !== undefined;
    if (hasCode === hasName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [hasCode ? 'groupName' : 'joinCode'],
        message: 'יש לשלוח קוד הצטרפות או שם לקבוצה חדשה – אחד מהשניים בדיוק',
      });
    }
  });

export const loginSchema = z
  .object({
    username: z.string({ required_error: 'שדה חובה' }).trim().min(1, 'שדה חובה').transform((v) => v.toLowerCase()),
    password: z.string({ required_error: 'שדה חובה' }).min(1, 'שדה חובה'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
