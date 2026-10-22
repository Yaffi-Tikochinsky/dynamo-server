import { prisma } from '../db/prisma';
import { AppError } from '../lib/errors';
import { eachDay, fromDbDate, today as getToday } from '../lib/dates';
import {
  assignRanks, currentStreak, dataUntil, MemberData, memberLastDay, missingDates, round, scoreForRange, sortByRank, weeklyForm,
} from '../lib/scoring';
import { AuthUser } from '../middleware/auth';
import { getVisibleChallenge, statusOf } from './challenge.service';

/**
 * Loads everything needed for results and applies the viewing lock:
 * - an ended challenge is open to everyone who can see it;
 * - otherwise only participants without missing days may see results.
 */
async function loadResults(challengeId: number, user: AuthUser) {
  const challenge = await getVisibleChallenge(challengeId, user);
  const today = getToday();
  const status = statusOf(challenge, today);
  const endDate = fromDbDate(challenge.endDate);

  const participants = await prisma.participant.findMany({
    where: { challengeId },
    include: { user: true, reports: true },
    orderBy: { user: { displayName: 'asc' } },
  });
  const members = participants.map((p) => ({
    user: p.user,
    data: {
      userId: p.userId,
      firstDay: fromDbDate(p.firstDay),
      reports: new Map(p.reports.map((r) => [fromDbDate(r.date), { value: r.value, skipped: r.skipped }])),
    } satisfies MemberData,
  }));

  const me = members.find((m) => m.user.id === user.id);
  if (status !== 'ENDED') {
    if (!me) throw new AppError(403, 'RESULTS_LOCKED', 'רק משתתפים באתגר רואים את התוצאות לפני סיומו', { reason: 'NOT_PARTICIPANT' });
    const missing = missingDates(status, me.data.firstDay, endDate, today, new Set(me.data.reports.keys()));
    if (missing.length) {
      throw new AppError(403, 'RESULTS_LOCKED', 'יש להשלים את הדיווחים החסרים כדי לראות את התוצאות', { reason: 'MISSING_REPORTS', missingCount: missing.length });
    }
  }

  const until = dataUntil(status, endDate, today, me?.data.reports.has(today) ?? false);
  return { challenge, status, today, until, members };
}

const publicUser = (u: { id: number; displayName: string; avatar: string; color: string }) => ({
  id: u.id, displayName: u.displayName, avatar: u.avatar, color: u.color,
});

export async function getLeaderboard(challengeId: number, user: AuthUser) {
  const { challenge, status, today, until, members } = await loadResults(challengeId, user);

  const scored = members.map((m) => {
    const lastDay = memberLastDay(status, until, today, m.data);
    return { m, lastDay, score: scoreForRange(challenge.scale, m.data, m.data.firstDay, lastDay) };
  });
  const rows = sortByRank(assignRanks(scored)).map(({ m, lastDay, score, rank }) => ({
    rank,
    user: publicUser(m.user),
    percentage: score.percentage === null ? null : round(score.percentage),
    daysCounted: score.daysCounted,
    currentStreak: currentStreak(challenge.scale, m.data, lastDay),
    isMe: m.user.id === user.id,
  }));

  const winners = status === 'ENDED'
    ? rows.filter((r) => r.rank === 1 && r.percentage !== null && r.percentage > 0).map((r) => r.user)
    : null;

  return { dataUntil: until, status, prize: challenge.prize, rows, winners };
}

/** Points for the "weekly form" line chart: one object per day, one key per member ("u7"). */
export async function getProgress(challengeId: number, user: AuthUser) {
  const { challenge, status, today, until, members } = await loadResults(challengeId, user);
  const series = members.map((m) => ({ key: `u${m.user.id}`, ...publicUser(m.user) }));
  if (until === null) return { dataUntil: null, series, points: [] };

  const lastDays = new Map(members.map((m) => [m.user.id, memberLastDay(status, until, today, m.data)]));
  const points = eachDay(fromDbDate(challenge.startDate), until).map((day) => {
    const point: Record<string, string | number | null> = { date: day };
    for (const m of members) point[`u${m.user.id}`] = weeklyForm(challenge.scale, m.data, day, lastDays.get(m.user.id) ?? null);
    return point;
  });
  return { dataUntil: until, series, points };
}
