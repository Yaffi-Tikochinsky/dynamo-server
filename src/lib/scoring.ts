// Pure scoring rules (no database access), so they are easy to test and explain.
import { Scale } from '@prisma/client';
import { SCALE_MAX } from './constants';
import { addDays, eachDay, maxDay, minDay } from './dates';

export type ChallengeStatus = 'UPCOMING' | 'ACTIVE' | 'ENDED';

export interface DayReport {
  value: number;
  skipped: boolean;
}

export interface MemberData {
  userId: number;
  firstDay: string;
  /** Reports by date ("YYYY-MM-DD"). */
  reports: Map<string, DayReport>;
}

export function challengeStatus(startDate: string, endDate: string, today: string): ChallengeStatus {
  if (today < startDate) return 'UPCOMING';
  if (today > endDate) return 'ENDED';
  return 'ACTIVE';
}

/** Last day of the join window (never after the end date). */
export function joinDeadline(startDate: string, endDate: string, joinWindowDays: number): string {
  return minDay(addDays(startDate, joinWindowDays), endDate);
}

/**
 * Past days (up to yesterday) the participant has not reported yet.
 * Only active challenges have missing days; when a challenge ends, unreported days simply count as 0.
 */
export function missingDates(status: ChallengeStatus, firstDay: string, endDate: string, today: string, reported: Set<string>): string[] {
  if (status !== 'ACTIVE') return [];
  return eachDay(firstDay, minDay(addDays(today, -1), endDate)).filter((d) => !reported.has(d));
}

/**
 * The last day whose data the viewer may see.
 * Active challenge: today only if the viewer already reported today, otherwise yesterday.
 */
export function dataUntil(status: ChallengeStatus, endDate: string, today: string, viewerReportedToday: boolean): string | null {
  if (status === 'UPCOMING') return null;
  if (status === 'ENDED') return endDate;
  return viewerReportedToday ? today : addDays(today, -1);
}

/** The last day counted for one member: today counts only if the member reported it (and the viewer may see today). */
export function memberLastDay(status: ChallengeStatus, until: string | null, today: string, member: MemberData): string | null {
  if (until === null) return null;
  if (status === 'ENDED') return until;
  if (until === today && member.reports.has(today)) return today;
  return minDay(until, addDays(today, -1));
}

export interface Score {
  /** Sum of report values in the counted days (missing days count as 0). */
  sum: number;
  /** Highest possible sum for the counted days. */
  max: number;
  daysCounted: number;
  /** sum / max * 100, or null when no day is counted yet. */
  percentage: number | null;
}

export function scoreForRange(scale: Scale, member: MemberData, from: string, to: string | null): Score {
  if (to === null || to < from) return { sum: 0, max: 0, daysCounted: 0, percentage: null };
  const days = eachDay(from, to);
  const sum = days.reduce((acc, d) => acc + (member.reports.get(d)?.value ?? 0), 0);
  const max = days.length * SCALE_MAX[scale];
  return { sum, max, daysCounted: days.length, percentage: (sum / max) * 100 };
}

/** Consecutive successful days ending at lastDay. YES_NO: "yes" days. RATING: any real (not skipped) report. */
export function currentStreak(scale: Scale, member: MemberData, lastDay: string | null): number {
  if (lastDay === null) return 0;
  let streak = 0;
  for (let d = lastDay; d >= member.firstDay; d = addDays(d, -1)) {
    const r = member.reports.get(d);
    const success = r !== undefined && !r.skipped && (scale === 'YES_NO' ? r.value === 1 : true);
    if (!success) break;
    streak++;
  }
  return streak;
}

/**
 * Ranks by exact percentage (compared as fractions, so 83.4% and 83.3% are never a tie).
 * Equal scores share a place (1, 1, 3). Members without data get rank null.
 */
export function assignRanks<T extends { score: Score }>(items: T[]): (T & { rank: number | null })[] {
  const better = (a: Score, b: Score) => a.sum * b.max > b.sum * a.max;
  return items.map((item) => {
    if (item.score.percentage === null) return { ...item, rank: null };
    const ahead = items.filter((o) => o.score.percentage !== null && better(o.score, item.score)).length;
    return { ...item, rank: ahead + 1 };
  });
}

export function sortByRank<T extends { rank: number | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
}

/** Success percentage over the 7 days ending at `day` (fewer if the member joined later). */
export function weeklyForm(scale: Scale, member: MemberData, day: string, lastDay: string | null): number | null {
  if (lastDay === null || day < member.firstDay || day > lastDay) return null;
  const score = scoreForRange(scale, member, maxDay(member.firstDay, addDays(day, -6)), day);
  return score.percentage === null ? null : round(score.percentage);
}

export const round = (n: number, digits = 2): number => Math.round(n * 10 ** digits) / 10 ** digits;
