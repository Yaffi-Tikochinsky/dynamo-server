import { prisma } from '../db/prisma';
import { AppError, badRequest, conflict, FieldError, notFound, ruleViolation } from '../lib/errors';
import { fromDbDate, toDbDate, today as getToday } from '../lib/dates';
import { missingDates } from '../lib/scoring';
import { AuthUser } from '../middleware/auth';
import { SubmitReportsInput } from '../schemas/report.schemas';
import { getVisibleChallenge, statusOf } from './challenge.service';

async function loadParticipation(challengeId: number, user: AuthUser) {
  const challenge = await getVisibleChallenge(challengeId, user);
  const participant = await prisma.participant.findUnique({
    where: { challengeId_userId: { challengeId, userId: user.id } },
    include: { reports: { select: { date: true } } },
  });
  if (!participant) throw notFound('אינך משתתף באתגר הזה');
  const today = getToday();
  const status = statusOf(challenge, today);
  const firstDay = fromDbDate(participant.firstDay);
  const reported = new Set(participant.reports.map((r) => fromDbDate(r.date)));
  const missing = missingDates(status, firstDay, fromDbDate(challenge.endDate), today, reported);
  const canReportToday = status === 'ACTIVE' && firstDay <= today && !reported.has(today);
  return { challenge, status, today, reported, missing, canReportToday };
}

/** What the participant still has to report: past missing days, and today. */
export async function getPending(challengeId: number, user: AuthUser) {
  const { challenge, status, today, reported, missing, canReportToday } = await loadParticipation(challengeId, user);
  return {
    scale: challenge.scale,
    status,
    missingDates: missing,
    today: { date: today, reported: reported.has(today), canReport: canReportToday },
  };
}

/**
 * Saves several reports at once. Past days that remain missing are saved as 0 (skipped),
 * but only when the client confirmed it with fillMissingWithZero = true.
 * Everything is saved in one transaction, or nothing is saved.
 */
export async function submitReports(challengeId: number, user: AuthUser, input: SubmitReportsInput) {
  const { challenge, status, today, reported, missing, canReportToday } = await loadParticipation(challengeId, user);
  if (status !== 'ACTIVE') throw ruleViolation(status === 'ENDED' ? 'האתגר הסתיים, אי אפשר לדווח' : 'האתגר עוד לא התחיל');

  const allowed = new Set(missing);
  if (canReportToday) allowed.add(today);

  const errors: FieldError[] = [];
  const seen = new Set<string>();
  input.reports.forEach((r, i) => {
    if (seen.has(r.date)) errors.push({ field: `reports.${i}.date`, message: 'התאריך מופיע פעמיים בבקשה' });
    seen.add(r.date);
    if (challenge.scale === 'YES_NO' && r.value !== 0 && r.value !== 1) errors.push({ field: `reports.${i}.value`, message: 'בסולם כן/לא הערך חייב להיות 0 או 1' });
    if (challenge.scale === 'RATING' && (r.value < 1 || r.value > 10)) errors.push({ field: `reports.${i}.value`, message: 'בסולם הדירוג הערך חייב להיות בין 1 ל-10' });
  });
  if (errors.length) throw badRequest('יש שגיאות בדיווחים', errors);

  const alreadyReported = input.reports.filter((r) => reported.has(r.date));
  if (alreadyReported.length) {
    throw conflict('כבר דיווחת על הימים האלה. אי אפשר לשנות דיווח', alreadyReported.map((r) => ({ field: 'date', message: r.date })));
  }
  const notAllowed = input.reports.filter((r) => !allowed.has(r.date));
  if (notAllowed.length) {
    throw badRequest('אפשר לדווח רק על ימים חסרים ועל היום', notAllowed.map((r) => ({ field: 'date', message: `${r.date} – לא ניתן לדווח על יום זה` })));
  }

  const remaining = missing.filter((d) => !seen.has(d));
  if (remaining.length && !input.fillMissingWithZero) {
    throw new AppError(400, 'MISSING_NOT_CONFIRMED', `נותרו ${remaining.length} ימים שלא דווחו. כדי שיקבלו 0 יש לשלוח fillMissingWithZero: true`, { remainingDates: remaining });
  }

  const rows = [
    ...input.reports.map((r) => ({ challengeId, userId: user.id, date: toDbDate(r.date), value: r.value, skipped: false })),
    ...remaining.map((d) => ({ challengeId, userId: user.id, date: toDbDate(d), value: 0, skipped: true })),
  ];
  await prisma.$transaction([prisma.report.createMany({ data: rows })]);

  return {
    created: rows.length,
    skipped: remaining,
    missingDates: [] as string[],
    todayReported: reported.has(today) || seen.has(today),
  };
}
