import { describe, expect, it } from 'vitest';
import { api, auth, createChallenge, join, publicChallenge, registerManager, registerMember, report, setToday, useCleanDatabase } from './helpers';
import { prisma } from '../src/db/prisma';

useCleanDatabase();

async function setup(scale: 'YES_NO' | 'RATING' = 'YES_NO') {
  const manager = await registerManager();
  const noa = await registerMember(manager.joinCode, 'נועה');
  const dani = await registerMember(manager.joinCode, 'דני');
  const c = await createChallenge(manager.token, publicChallenge({ scale, endDate: '2026-11-10', joinWindowDays: 5 }));
  return { manager, noa, dani, id: c.id };
}

describe('pending and submitting reports', () => {
  it('lists missing past days and today', async () => {
    const { noa, id } = await setup();
    await join(noa.token, id);
    setToday('2026-11-04');
    const res = await api().get(`/api/challenges/${id}/pending`).set(auth(noa.token));
    expect(res.body).toEqual({ scale: 'YES_NO', status: 'ACTIVE', missingDates: ['2026-11-01', '2026-11-02', '2026-11-03'], today: { date: '2026-11-04', reported: false, canReport: true } });
  });

  it('refuses to leave days missing without confirmation, and saves nothing', async () => {
    const { noa, id } = await setup();
    await join(noa.token, id);
    setToday('2026-11-04');
    const res = await report(noa.token, id, [{ date: '2026-11-03', value: 1 }]);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_NOT_CONFIRMED');
    expect(res.body.error.details.remainingDates).toEqual(['2026-11-01', '2026-11-02']);
    expect(await prisma.report.count()).toBe(0);
  });

  it('with confirmation, the remaining past days get 0; today may stay open', async () => {
    const { noa, id } = await setup();
    await join(noa.token, id);
    setToday('2026-11-04');
    const res = await report(noa.token, id, [{ date: '2026-11-03', value: 1 }], true);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ created: 3, skipped: ['2026-11-01', '2026-11-02'], missingDates: [], todayReported: false });
    const pending = await api().get(`/api/challenges/${id}/pending`).set(auth(noa.token));
    expect(pending.body.missingDates).toEqual([]);
    expect(pending.body.today.canReport).toBe(true);
  });

  it('a report cannot be changed (409) and future days cannot be reported', async () => {
    const { noa, id } = await setup();
    await join(noa.token, id);
    expect((await report(noa.token, id, [{ date: '2026-11-01', value: 1 }])).status).toBe(201);
    expect((await report(noa.token, id, [{ date: '2026-11-01', value: 0 }])).status).toBe(409);
    expect((await report(noa.token, id, [{ date: '2026-11-02', value: 1 }])).status).toBe(400);
  });

  it('validates values for each scale and duplicate dates', async () => {
    const yes = await setup('YES_NO');
    await join(yes.noa.token, yes.id);
    expect((await report(yes.noa.token, yes.id, [{ date: '2026-11-01', value: 2 }])).status).toBe(400);
    const rating = await setup('RATING');
    await join(rating.noa.token, rating.id);
    expect((await report(rating.noa.token, rating.id, [{ date: '2026-11-01', value: 0 }])).status).toBe(400);
    expect((await report(rating.noa.token, rating.id, [{ date: '2026-11-01', value: 11 }])).status).toBe(400);
    expect((await report(rating.noa.token, rating.id, [{ date: '2026-11-01', value: 7 }, { date: '2026-11-01', value: 8 }])).status).toBe(400);
    expect((await report(rating.noa.token, rating.id, [{ date: '2026-11-01', value: 7 }])).status).toBe(201);
  });

  it('non-participants cannot report; nobody can report after the end', async () => {
    const { noa, dani, id } = await setup();
    await join(noa.token, id);
    expect((await report(dani.token, id, [{ date: '2026-11-01', value: 1 }])).status).toBe(404);
    setToday('2026-11-12');
    expect((await report(noa.token, id, [], true)).status).toBe(400);
    expect((await api().get(`/api/challenges/${id}/pending`).set(auth(noa.token))).body.missingDates).toEqual([]);
  });
});

describe('results: locking, ranking, winners and charts', () => {
  it('locks results for non-participants and for participants with missing days', async () => {
    const { noa, dani, id } = await setup();
    await join(noa.token, id);
    expect((await api().get(`/api/challenges/${id}/leaderboard`).set(auth(dani.token))).body.error).toMatchObject({ code: 'RESULTS_LOCKED', details: { reason: 'NOT_PARTICIPANT' } });
    setToday('2026-11-03');
    const locked = await api().get(`/api/challenges/${id}/leaderboard`).set(auth(noa.token));
    expect(locked.status).toBe(403);
    expect(locked.body.error.details).toEqual({ reason: 'MISSING_REPORTS', missingCount: 2 });
    const details = await api().get(`/api/challenges/${id}`).set(auth(noa.token));
    expect(details.body.permissions).toMatchObject({ canViewResults: false, lockedReason: 'MISSING_REPORTS' });
    expect((await api().get(`/api/challenges/${id}/progress`).set(auth(noa.token))).status).toBe(403);
  });

  it('percentages count from each member\'s first day, ties share a place, and today shows only after reporting', async () => {
    const { manager, noa, dani, id } = await setup();
    await join(manager.token, id);
    await join(noa.token, id);
    setToday('2026-11-03');
    await join(dani.token, id); // joined late: first day 3.11
    await report(manager.token, id, [{ date: '2026-11-01', value: 1 }, { date: '2026-11-02', value: 0 }]);
    await report(noa.token, id, [{ date: '2026-11-01', value: 0 }, { date: '2026-11-02', value: 1 }, { date: '2026-11-03', value: 1 }]);
    setToday('2026-11-04');
    await report(dani.token, id, [{ date: '2026-11-03', value: 1 }, { date: '2026-11-04', value: 1 }]);
    await report(manager.token, id, [{ date: '2026-11-03', value: 1 }]);
    await report(noa.token, id, [{ date: '2026-11-04', value: 0 }]);

    // Manager did not report today -> sees data until yesterday for everyone
    const asManager = await api().get(`/api/challenges/${id}/leaderboard`).set(auth(manager.token));
    expect(asManager.body.dataUntil).toBe('2026-11-03');
    const byName = (body: { rows: { user: { displayName: string }; rank: number; percentage: number }[] }) =>
      Object.fromEntries(body.rows.map((r) => [r.user.displayName, [r.rank, r.percentage]]));
    expect(byName(asManager.body)).toEqual({ 'דני': [1, 100], 'נועה': [2, 66.67], 'מנהל': [2, 66.67] });

    // Noa reported today -> today is included for those who reported it
    const asNoa = await api().get(`/api/challenges/${id}/leaderboard`).set(auth(noa.token));
    expect(asNoa.body.dataUntil).toBe('2026-11-04');
    expect(byName(asNoa.body)).toEqual({ 'דני': [1, 100], 'מנהל': [2, 66.67], 'נועה': [3, 50] });
    expect(asNoa.body.winners).toBeNull();
    const dani2 = asNoa.body.rows.find((r: { user: { displayName: string } }) => r.user.displayName === 'דני');
    expect(dani2.currentStreak).toBe(2);
  });

  it('after the end: no lock, unreported days count as 0, and winners are announced (shared first place)', async () => {
    const { manager, noa, dani, id } = await setup();
    await join(manager.token, id);
    await join(noa.token, id);
    await prisma.challenge.update({ where: { id }, data: { endDate: new Date('2026-11-02T00:00:00Z') } });
    setToday('2026-11-02');
    await report(manager.token, id, [{ date: '2026-11-01', value: 1 }, { date: '2026-11-02', value: 1 }]);
    await report(noa.token, id, [{ date: '2026-11-01', value: 1 }, { date: '2026-11-02', value: 1 }]);
    setToday('2026-11-05');
    const res = await api().get(`/api/challenges/${id}/leaderboard`).set(auth(dani.token)); // dani never joined
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ENDED');
    expect(res.body.winners.map((w: { displayName: string }) => w.displayName).sort()).toEqual(['מנהל', 'נועה']);
    expect(res.body.prize).toBe('גלידה');
    const details = await api().get(`/api/challenges/${id}`).set(auth(dani.token));
    expect(details.body.permissions).toMatchObject({ canViewResults: true, lockedReason: null });
  });

  it('no winner when everybody has 0%', async () => {
    const { manager, id } = await setup();
    await join(manager.token, id);
    await prisma.challenge.update({ where: { id }, data: { endDate: new Date('2026-11-01T00:00:00Z') } });
    setToday('2026-11-03');
    const res = await api().get(`/api/challenges/${id}/leaderboard`).set(auth(manager.token));
    expect(res.body.rows[0]).toMatchObject({ rank: 1, percentage: 0 });
    expect(res.body.winners).toEqual([]);
  });

  it('weekly form uses the last 7 days and is null before a member joined', async () => {
    const { manager, noa, id } = await setup();
    await join(manager.token, id);
    setToday('2026-11-06'); // last day of the 5-day join window
    await join(noa.token, id);
    setToday('2026-11-09');
    // manager: days 1-8 = 0,0,1,1,1,1,1,1 ; today 9 = 1
    await report(manager.token, id, [
      { date: '2026-11-01', value: 0 }, { date: '2026-11-02', value: 0 }, { date: '2026-11-03', value: 1 }, { date: '2026-11-04', value: 1 },
      { date: '2026-11-05', value: 1 }, { date: '2026-11-06', value: 1 }, { date: '2026-11-07', value: 1 }, { date: '2026-11-08', value: 1 },
      { date: '2026-11-09', value: 1 },
    ]);
    const res = await api().get(`/api/challenges/${id}/progress`).set(auth(manager.token));
    expect(res.status).toBe(200);
    const key = `u${manager.user.id}`;
    const noaKey = `u${noa.user.id}`;
    const point = (d: string) => res.body.points.find((p: { date: string }) => p.date === d);
    expect(point('2026-11-01')[key]).toBe(0);
    expect(point('2026-11-07')[key]).toBe(71.43); // 5 of 7
    expect(point('2026-11-09')[key]).toBe(100); // days 3-9
    expect(point('2026-11-05')[noaKey]).toBeNull(); // before noa joined
    expect(point('2026-11-08')[noaKey]).toBe(0); // unreported days count as 0
    expect(point('2026-11-09')[noaKey]).toBeNull(); // noa has not reported today
    expect(res.body.series.map((s: { key: string }) => s.key)).toContain(noaKey);
  });
});
