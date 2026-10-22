import { z } from 'zod';
import { Scale, Visibility } from '@prisma/client';
import { LIMITS } from '../lib/constants';
import { dayString } from '../lib/validation';

const title = z
  .string({ required_error: 'שדה חובה' })
  .trim()
  .min(LIMITS.titleMin, `שם האתגר חייב להכיל לפחות ${LIMITS.titleMin} תווים`)
  .max(LIMITS.titleMax, `שם האתגר יכול להכיל עד ${LIMITS.titleMax} תווים`);

/** Empty strings are treated as "no value". */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} יכול להכיל עד ${max} תווים`)
    .nullish()
    .transform((v) => (v ? v : null));

const scale = z.nativeEnum(Scale, { errorMap: () => ({ message: 'הסולם חייב להיות YES_NO או RATING' }) });
const visibility = z.nativeEnum(Visibility, { errorMap: () => ({ message: 'הפרטיות חייבת להיות PUBLIC או PRIVATE' }) });
const joinWindowDays = z
  .number({ invalid_type_error: 'יש להזין מספר ימים' })
  .int('יש להזין מספר שלם')
  .min(0, 'חלון ההצטרפות לא יכול להיות שלילי')
  .nullish();

export const createChallengeSchema = z
  .object({
    title,
    description: optionalText(LIMITS.descriptionMax, 'התיאור'),
    scale,
    visibility,
    startDate: dayString,
    endDate: dayString,
    prize: optionalText(LIMITS.prizeMax, 'הפרס'),
    joinWindowDays,
    previousChallengeId: z.number({ invalid_type_error: 'מזהה לא תקין' }).int().positive().nullish(),
  })
  .strict();

/** Editing: every field is optional; send only what changes. */
export const updateChallengeSchema = z
  .object({
    title: title.optional(),
    description: optionalText(LIMITS.descriptionMax, 'התיאור').optional(),
    scale: scale.optional(),
    visibility: visibility.optional(),
    startDate: dayString.optional(),
    endDate: dayString.optional(),
    prize: optionalText(LIMITS.prizeMax, 'הפרס').optional(),
    joinWindowDays: joinWindowDays.optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, 'יש לשלוח לפחות שדה אחד לעדכון');

const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

export const listChallengesQuerySchema = z.object({
  search: z.string().trim().max(60).optional(),
  status: z.enum(['UPCOMING', 'ACTIVE', 'ENDED']).optional(),
  scale: scale.optional(),
  visibility: visibility.optional(),
  joined: booleanQuery.optional(),
  sort: z.enum(['endDate', 'startDate', 'participants', 'title']).default('endDate'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
export type ListChallengesQuery = z.infer<typeof listChallengesQuerySchema>;
