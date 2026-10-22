import { z } from 'zod';
import { dayString } from '../lib/validation';

export const submitReportsSchema = z
  .object({
    reports: z
      .array(
        z
          .object({
            date: dayString,
            value: z.number({ required_error: 'שדה חובה', invalid_type_error: 'הערך חייב להיות מספר' }).int('הערך חייב להיות מספר שלם'),
          })
          .strict(),
      )
      .max(400, 'יותר מדי דיווחים בבקשה אחת'),
    fillMissingWithZero: z.boolean().default(false),
  })
  .strict();

export type SubmitReportsInput = z.infer<typeof submitReportsSchema>;
