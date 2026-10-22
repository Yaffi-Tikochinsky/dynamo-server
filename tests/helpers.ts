import request from 'supertest';
import { beforeEach, afterAll } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { setTodayForTests } from '../src/lib/dates';

export const app = createApp();
export const api = () => request(app);
export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const DAY0 = '2026-11-01';

/** Clean database and a fixed "today" before every test. */
export function useCleanDatabase() {
  beforeEach(async () => {
    setTodayForTests(DAY0);
    await prisma.$executeRawUnsafe('TRUNCATE "Report", "Participant", "Challenge", "User", "Group" RESTART IDENTITY CASCADE');
  });
  afterAll(async () => {
    setTodayForTests(null);
    await prisma.$disconnect();
  });
}

export const setToday = (day: string) => setTodayForTests(day);

let counter = 0;
const uniqueName = (prefix: string) => `${prefix}${++counter}`;

export async function registerManager(groupName = 'הקבוצה שלנו') {
  const username = uniqueName('mgr');
  const res = await api().post('/api/auth/register').send({ username, password: 'Secret123', displayName: 'מנהל', avatar: 'LION', groupName });
  if (res.status !== 201) throw new Error(`register manager failed: ${JSON.stringify(res.body)}`);
  const group = await prisma.group.findUniqueOrThrow({ where: { id: res.body.user.group.id } });
  return { token: res.body.token as string, user: res.body.user, joinCode: group.joinCode, username };
}

export async function registerMember(joinCode: string, displayName = 'חבר') {
  const username = uniqueName('mem');
  const res = await api().post('/api/auth/register').send({ username, password: 'Secret123', displayName, avatar: 'OWL', joinCode });
  if (res.status !== 201) throw new Error(`register member failed: ${JSON.stringify(res.body)}`);
  return { token: res.body.token as string, user: res.body.user, username };
}

export const publicChallenge = (overrides: Record<string, unknown> = {}) => ({
  title: 'קריאה יומית',
  description: 'עשרים דפים',
  scale: 'YES_NO',
  visibility: 'PUBLIC',
  startDate: DAY0,
  endDate: '2026-11-10',
  prize: 'גלידה',
  joinWindowDays: 3,
  ...overrides,
});

export async function createChallenge(token: string, body: Record<string, unknown>) {
  const res = await api().post('/api/challenges').set(auth(token)).send(body);
  if (res.status !== 201) throw new Error(`create challenge failed: ${JSON.stringify(res.body)}`);
  return res.body as { id: number } & Record<string, unknown>;
}

export async function join(token: string, id: number) {
  const res = await api().post(`/api/challenges/${id}/join`).set(auth(token));
  if (res.status !== 201) throw new Error(`join failed: ${JSON.stringify(res.body)}`);
}

export async function report(token: string, id: number, reports: { date: string; value: number }[], fillMissingWithZero = false) {
  return api().post(`/api/challenges/${id}/reports`).set(auth(token)).send({ reports, fillMissingWithZero });
}
