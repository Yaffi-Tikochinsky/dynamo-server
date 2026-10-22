import { Challenge, Prisma, Scale, Visibility } from '@prisma/client';
import { prisma } from '../db/prisma';
import { badRequest, conflict, FieldError, forbidden, notFound, ruleViolation } from '../lib/errors';
import { LIMITS } from '../lib/constants';
import { addDays, diffDays, fromDbDate, maxDay, toDbDate, today as getToday } from '../lib/dates';
import { ChallengeStatus, challengeStatus, joinDeadline, missingDates } from '../lib/scoring';
import { AuthUser } from '../middleware/auth';
import { CreateChallengeInput, ListChallengesQuery, UpdateChallengeInput } from '../schemas/challenge.schemas';

// ---------- shared helpers ----------

/** Challenges the user may see: public ones of the group, and the user's own private ones. */
export function visibleWhere(user: AuthUser): Prisma.ChallengeWhereInput {
  return { groupId: user.groupId, OR: [{ visibility: 'PUBLIC' }, { creatorId: user.id }] };
}

/** Loads a challenge the user may see, or throws 404 (other groups and other people's private challenges look like they don't exist). */
export async function getVisibleChallenge(id: number, user: AuthUser): Promise<Challenge> {
  const challenge = await prisma.challenge.findFirst({ where: { id, ...visibleWhere(user) } });
  if (!challenge) throw notFound('האתגר לא נמצא');
  return challenge;
}

export function statusOf(c: Challenge, today: string): ChallengeStatus {
  return challengeStatus(fromDbDate(c.startDate), fromDbDate(c.endDate), today);
}

/** Public challenge: the manager. Private challenge: its creator. */
export function hasOwnerRights(c: Challenge, user: AuthUser): boolean {
  return c.visibility === 'PUBLIC' ? user.role === 'MANAGER' : c.creatorId === user.id;
}

function joinDeadlineOf(c: Challenge): string | null {
  return c.visibility === 'PUBLIC' && c.joinWindowDays !== null
    ? joinDeadline(fromDbDate(c.startDate), fromDbDate(c.endDate), c.joinWindowDays)
    : null;
}

function canJoinOf(c: Challenge, status: ChallengeStatus, isJoined: boolean, today: string): boolean {
  const deadline = joinDeadlineOf(c);
  return c.visibility === 'PUBLIC' && !isJoined && status !== 'ENDED' && deadline !== null && today <= deadline;
}

/** Personal status for a challenge card. Only active challenges the user joined have one. */
function myStatusOf(status: ChallengeStatus, participant: { firstDay: Date; reports: { date: Date }[] } | undefined, c: Challenge, today: string) {
  if (!participant || status !== 'ACTIVE') return null;
  const reported = new Set(participant.reports.map((r) => fromDbDate(r.date)));
  return {
    reportedToday: reported.has(today),
    missingCount: missingDates(status, fromDbDate(participant.firstDay), fromDbDate(c.endDate), today, reported).length,
  };
}

const myParticipation = (userId: number) => ({
  where: { userId },
  select: { firstDay: true, reports: { select: { date: true } } },
});

type ChallengeWithMine = Challenge & {
  _count: { participants: number };
  participants: { firstDay: Date; reports: { date: Date }[] }[];
};

function toSummary(c: ChallengeWithMine, today: string) {
  const status = statusOf(c, today);
  const mine = c.participants[0];
  return {
    id: c.id,
    title: c.title,
    scale: c.scale,
    visibility: c.visibility,
    status,
    startDate: fromDbDate(c.startDate),
    endDate: fromDbDate(c.endDate),
    prize: c.prize,
    joinWindowDays: c.joinWindowDays,
    joinDeadline: joinDeadlineOf(c),
    participantsCount: c._count.participants,
    isJoined: Boolean(mine),
    canJoin: canJoinOf(c, status, Boolean(mine), today),
    myStatus: myStatusOf(status, mine, c, today),
    previousChallengeId: c.previousChallengeId,
  };
}

// ---------- list ----------

function statusWhere(status: ChallengeStatus | undefined, today: string): Prisma.ChallengeWhereInput {
  const t = toDbDate(today);
  if (status === 'UPCOMING') return { startDate: { gt: t } };
  if (status === 'ENDED') return { endDate: { lt: t } };
  if (status === 'ACTIVE') return { startDate: { lte: t }, endDate: { gte: t } };
  return {};
}

export async function listChallenges(user: AuthUser, q: ListChallengesQuery) {
  const today = getToday();
  const where: Prisma.ChallengeWhereInput = {
    AND: [
      visibleWhere(user),
      statusWhere(q.status, today),
      q.search ? { title: { contains: q.search, mode: 'insensitive' } } : {},
      q.scale ? { scale: q.scale } : {},
      q.visibility ? { visibility: q.visibility } : {},
      q.joined === true ? { participants: { some: { userId: user.id } } } : {},
      q.joined === false ? { participants: { none: { userId: user.id } } } : {},
    ],
  };
  const orderBy: Prisma.ChallengeOrderByWithRelationInput[] = [
    q.sort === 'participants' ? { participants: { _count: q.order } } : { [q.sort]: q.order },
    { id: 'asc' },
  ];
  const challenges = await prisma.challenge.findMany({
    where,
    orderBy,
    include: { _count: { select: { participants: true } }, participants: myParticipation(user.id) },
  });
  return challenges.map((c) => toSummary(c, today));
}

// ---------- details ----------

const EDITABLE_BEFORE_START = ['title', 'description', 'scale', 'startDate', 'endDate', 'prize', 'joinWindowDays'] as const;
const EDITABLE_AFTER_START = ['title', 'description', 'prize', 'endDate'] as const;
const PUBLIC_ONLY_FIELDS = ['prize', 'joinWindowDays'];

function editableFields(c: Challenge, status: ChallengeStatus): string[] {
  if (status === 'ENDED') return [];
  const fields: readonly string[] = status === 'UPCOMING' ? EDITABLE_BEFORE_START : EDITABLE_AFTER_START;
  return fields.filter((f) => c.visibility === 'PUBLIC' || !PUBLIC_ONLY_FIELDS.includes(f));
}

export async function getChallengeDetails(id: number, user: AuthUser) {
  const today = getToday();
  await getVisibleChallenge(id, user);
  const c = await prisma.challenge.findUniqueOrThrow({
    where: { id },
    include: {
      _count: { select: { participants: true } },
      participants: myParticipation(user.id),
      creator: { select: { id: true, displayName: true } },
      previousChallenge: { select: { id: true, title: true } },
    },
  });
  const allParticipants = await prisma.participant.findMany({
    where: { challengeId: id },
    include: { user: true },
    orderBy: { user: { displayName: 'asc' } },
  });

  const summary = toSummary(c, today);
  const status = summary.status;
  const owner = hasOwnerRights(c, user);
  const lockedReason = !summary.isJoined && status !== 'ENDED'
    ? 'NOT_PARTICIPANT'
    : summary.myStatus && summary.myStatus.missingCount > 0 ? 'MISSING_REPORTS' : null;

  return {
    ...summary,
    description: c.description,
    creator: c.creator,
    previousChallenge: c.previousChallenge,
    participants: allParticipants.map((p) => ({
      id: p.user.id,
      displayName: p.user.displayName,
      avatar: p.user.avatar,
      color: p.user.color,
      firstDay: fromDbDate(p.firstDay),
    })),
    permissions: {
      canEdit: owner && status !== 'ENDED',
      canDelete: c.visibility === 'PRIVATE' ? owner : owner && status === 'UPCOMING',
      canJoin: summary.canJoin,
      canLeave: c.visibility === 'PUBLIC' && summary.isJoined && status === 'UPCOMING',
      canRenew: owner && status === 'ENDED',
      canViewResults: lockedReason === null,
      lockedReason,
    },
    editableFields: owner ? editableFields(c, status) : [],
    /** For "renew": today as the start date, and the same length as this challenge. */
    suggestedRenewalDates: owner && status === 'ENDED' ? renewalDates(c, today) : null,
  };
}

// ---------- create ----------

interface ChallengeFields {
  visibility: Visibility;
  startDate: string;
  endDate: string;
  prize: string | null;
  joinWindowDays: number | null;
}

/** Business rules shared by create and edit. */
function checkFieldRules(f: ChallengeFields, today: string, checkStartNotPast: boolean): void {
  const errors: FieldError[] = [];
  if (checkStartNotPast && f.startDate < today) errors.push({ field: 'startDate', message: 'תאריך ההתחלה לא יכול להיות בעבר' });
  if (f.endDate < f.startDate) errors.push({ field: 'endDate', message: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה או באותו יום' });
  else if (diffDays(f.startDate, f.endDate) + 1 > LIMITS.maxChallengeDays) {
    errors.push({ field: 'endDate', message: `אתגר יכול להימשך עד ${LIMITS.maxChallengeDays} ימים` });
  }
  if (f.visibility === 'PUBLIC') {
    if (f.joinWindowDays === null) errors.push({ field: 'joinWindowDays', message: 'באתגר ציבורי יש לקבוע חלון הצטרפות (0 ומעלה)' });
    else if (f.endDate >= f.startDate && f.joinWindowDays > diffDays(f.startDate, f.endDate)) {
      errors.push({ field: 'joinWindowDays', message: 'חלון ההצטרפות לא יכול להיות ארוך ממשך האתגר' });
    }
  } else {
    if (f.prize !== null) errors.push({ field: 'prize', message: 'לאתגר פרטי אין פרס' });
    if (f.joinWindowDays !== null) errors.push({ field: 'joinWindowDays', message: 'לאתגר פרטי אין חלון הצטרפות' });
  }
  if (errors.length) throw badRequest('יש שגיאות בנתונים שנשלחו', errors);
}

export async function createChallenge(user: AuthUser, input: CreateChallengeInput) {
  const today = getToday();
  if (input.visibility === 'PUBLIC' && user.role !== 'MANAGER') throw forbidden('רק מנהל הקבוצה יכול ליצור אתגר ציבורי');

  const fields: ChallengeFields = {
    visibility: input.visibility,
    startDate: input.startDate,
    endDate: input.endDate,
    prize: input.prize ?? null,
    joinWindowDays: input.joinWindowDays ?? null,
  };
  checkFieldRules(fields, today, true);

  if (input.previousChallengeId) {
    const previous = await prisma.challenge.findFirst({ where: { id: input.previousChallengeId, ...visibleWhere(user) } });
    if (!previous) throw notFound('האתגר הקודם לא נמצא', [{ field: 'previousChallengeId', message: 'האתגר הקודם לא נמצא' }]);
    if (statusOf(previous, today) !== 'ENDED') {
      throw ruleViolation('אפשר לחדש רק אתגר שהסתיים', [{ field: 'previousChallengeId', message: 'האתגר הקודם עוד לא הסתיים' }]);
    }
    if (!hasOwnerRights(previous, user)) throw forbidden('אין לך הרשאה לחדש את האתגר הזה');
  }

  const created = await prisma.challenge.create({
    data: {
      groupId: user.groupId,
      creatorId: user.id,
      title: input.title,
      description: input.description ?? null,
      scale: input.scale,
      visibility: input.visibility,
      startDate: toDbDate(fields.startDate),
      endDate: toDbDate(fields.endDate),
      prize: fields.prize,
      joinWindowDays: fields.joinWindowDays,
      previousChallengeId: input.previousChallengeId ?? null,
      // The creator of a private challenge is its only participant.
      ...(input.visibility === 'PRIVATE' ? { participants: { create: { userId: user.id, firstDay: toDbDate(fields.startDate) } } } : {}),
    },
  });
  return getChallengeDetails(created.id, user);
}

// ---------- update ----------

type EditableState = ChallengeFields & { title: string; description: string | null; scale: Scale };

export async function updateChallenge(id: number, user: AuthUser, input: UpdateChallengeInput) {
  const today = getToday();
  const c = await getVisibleChallenge(id, user);
  if (!hasOwnerRights(c, user)) throw forbidden('רק מנהל הקבוצה יכול לערוך אתגר ציבורי');
  const status = statusOf(c, today);
  if (status === 'ENDED') throw ruleViolation('אי אפשר לערוך אתגר שהסתיים');

  const current: EditableState = {
    title: c.title,
    description: c.description,
    scale: c.scale,
    visibility: c.visibility,
    startDate: fromDbDate(c.startDate),
    endDate: fromDbDate(c.endDate),
    prize: c.prize,
    joinWindowDays: c.joinWindowDays,
  };
  // Only fields whose value really changes count (a form may send everything back).
  const changed = Object.entries(input).filter(([k, v]) => v !== undefined && v !== current[k as keyof EditableState]);
  const allowed = editableFields(c, status);
  const locked = changed.filter(([k]) => !allowed.includes(k));
  if (locked.length) {
    throw ruleViolation(
      status === 'ACTIVE' ? 'אחרי תחילת האתגר אפשר לשנות רק שם, תיאור, פרס ותאריך סיום' : 'אי אפשר לשנות את השדות האלה',
      locked.map(([k]) => ({ field: k, message: 'השדה נעול' })),
    );
  }
  if (changed.length === 0) return getChallengeDetails(id, user);

  const next: EditableState = { ...current, ...(Object.fromEntries(changed) as Partial<EditableState>) };
  if (status === 'ACTIVE' && next.endDate < current.endDate) {
    throw ruleViolation('אחרי תחילת האתגר אפשר רק להאריך את תאריך הסיום', [{ field: 'endDate', message: 'אפשר רק להאריך' }]);
  }
  const startChanged = next.startDate !== current.startDate;
  checkFieldRules(next, today, startChanged);

  await prisma.$transaction(async (tx) => {
    await tx.challenge.update({
      where: { id },
      data: {
        title: next.title,
        description: next.description,
        scale: next.scale,
        startDate: toDbDate(next.startDate),
        endDate: toDbDate(next.endDate),
        prize: next.prize,
        joinWindowDays: next.joinWindowDays,
      },
    });
    // Before the start everyone who joined starts on the (new) start date.
    if (startChanged) await tx.participant.updateMany({ where: { challengeId: id }, data: { firstDay: toDbDate(next.startDate) } });
  });
  return getChallengeDetails(id, user);
}

// ---------- delete ----------

export async function deleteChallenge(id: number, user: AuthUser): Promise<void> {
  const c = await getVisibleChallenge(id, user);
  if (!hasOwnerRights(c, user)) throw forbidden('רק מנהל הקבוצה יכול למחוק אתגר ציבורי');
  if (c.visibility === 'PUBLIC' && statusOf(c, getToday()) !== 'UPCOMING') {
    throw ruleViolation('אפשר למחוק אתגר ציבורי רק לפני שהתחיל');
  }
  await prisma.challenge.delete({ where: { id } });
}

// ---------- join / leave ----------

export async function joinChallenge(id: number, user: AuthUser) {
  const today = getToday();
  const c = await getVisibleChallenge(id, user);
  if (c.visibility === 'PRIVATE') throw ruleViolation('אי אפשר להצטרף לאתגר פרטי');
  const status = statusOf(c, today);
  if (status === 'ENDED') throw ruleViolation('האתגר כבר הסתיים');
  const deadline = joinDeadlineOf(c);
  if (deadline !== null && today > deadline) throw ruleViolation('חלון ההצטרפות לאתגר הזה נסגר');

  const existing = await prisma.participant.findUnique({ where: { challengeId_userId: { challengeId: id, userId: user.id } } });
  if (existing) throw conflict('כבר הצטרפת לאתגר הזה');

  const firstDay = maxDay(fromDbDate(c.startDate), today);
  await prisma.participant.create({ data: { challengeId: id, userId: user.id, firstDay: toDbDate(firstDay) } });
  return { challengeId: id, firstDay };
}

export async function leaveChallenge(id: number, user: AuthUser): Promise<void> {
  const c = await getVisibleChallenge(id, user);
  if (c.visibility === 'PRIVATE') throw ruleViolation('אי אפשר לעזוב אתגר פרטי. אפשר למחוק אותו');
  const existing = await prisma.participant.findUnique({ where: { challengeId_userId: { challengeId: id, userId: user.id } } });
  if (!existing) throw notFound('אינך משתתף באתגר הזה');
  if (statusOf(c, getToday()) !== 'UPCOMING') throw ruleViolation('אפשר לעזוב רק לפני שהאתגר התחיל');
  await prisma.participant.delete({ where: { challengeId_userId: { challengeId: id, userId: user.id } } });
}

/** Used by the renewal flow in the client: suggested dates for a renewed challenge. */
export function renewalDates(c: Challenge, today: string) {
  const length = diffDays(fromDbDate(c.startDate), fromDbDate(c.endDate));
  return { startDate: today, endDate: addDays(today, length) };
}
