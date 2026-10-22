import { describe, expect, it } from 'vitest';
import { api, auth, createChallenge, DAY0, join, publicChallenge, registerManager, registerMember, setToday, useCleanDatabase } from './helpers';

useCleanDatabase();

describe('creating challenges', () => {
  it('a member cannot create a public challenge (403)', async () => {
    const manager = await registerManager();
    const member = await registerMember(manager.joinCode);
    const res = await api().post('/api/challenges').set(auth(member.token)).send(publicChallenge());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('the manager creates a public challenge with all fields', async () => {
    const manager = await registerManager();
    const c = await createChallenge(manager.token, publicChallenge());
    expect(c).toMatchObject({ title: 'קריאה יומית', status: 'ACTIVE', visibility: 'PUBLIC', prize: 'גלידה', joinDeadline: '2026-11-04', participantsCount: 0, isJoined: false });
  });

  it('a member creates a private challenge and is its only participant', async () => {
    const manager = await registerManager();
    const member = await registerMember(manager.joinCode);
    const c = await createChallenge(member.token, { title: 'יומן תודה', scale: 'YES_NO', visibility: 'PRIVATE', startDate: DAY0, endDate: '2026-11-05' });
    expect(c.isJoined).toBe(true);
    expect(c.participantsCount).toBe(1);
  });

  it('validates the business rules', async () => {
    const manager = await registerManager();
    const bad = async (body: Record<string, unknown>) => (await api().post('/api/challenges').set(auth(manager.token)).send(body)).body.error;
    expect((await bad(publicChallenge({ startDate: '2026-10-30' }))).details[0].field).toBe('startDate');
    expect((await bad(publicChallenge({ endDate: '2026-10-31' }))).details[0].field).toBe('endDate');
    expect((await bad(publicChallenge({ endDate: '2027-12-31' }))).details[0].field).toBe('endDate');
    expect((await bad(publicChallenge({ joinWindowDays: null }))).details[0].field).toBe('joinWindowDays');
    expect((await bad(publicChallenge({ joinWindowDays: 50 }))).details[0].field).toBe('joinWindowDays');
    expect((await bad({ ...publicChallenge(), visibility: 'PRIVATE' })).details.map((d: { field: string }) => d.field)).toEqual(['prize', 'joinWindowDays']);
    expect((await bad(publicChallenge({ title: 'א', scale: 'MAYBE', startDate: '2026-13-01' }))).code).toBe('VALIDATION_ERROR');
    expect((await bad(publicChallenge({ unknownField: 1 }))).code).toBe('VALIDATION_ERROR');
  });
});

describe('list: visibility, search, filter and sort', () => {
  it('shows public challenges of the group and only my private ones', async () => {
    const manager = await registerManager();
    const member = await registerMember(manager.joinCode);
    const stranger = await registerManager('זרים');
    await createChallenge(manager.token, publicChallenge({ title: 'ציבורי' }));
    const priv = await createChallenge(member.token, { title: 'סוד', scale: 'YES_NO', visibility: 'PRIVATE', startDate: DAY0, endDate: '2026-11-05' });
    await createChallenge(stranger.token, publicChallenge({ title: 'של זרים' }));

    const managerList = await api().get('/api/challenges').set(auth(manager.token));
    expect(managerList.body.map((c: { title: string }) => c.title)).toEqual(['ציבורי']);
    const memberList = await api().get('/api/challenges').set(auth(member.token));
    expect(memberList.body.map((c: { title: string }) => c.title).sort()).toEqual(['סוד', 'ציבורי']);
    // others get 404 for a private challenge and for another group's challenge
    expect((await api().get(`/api/challenges/${priv.id}`).set(auth(manager.token))).status).toBe(404);
    expect((await api().get(`/api/challenges/${priv.id}`).set(auth(stranger.token))).status).toBe(404);
  });

  it('search, status / scale / joined filters and sorting', async () => {
    const manager = await registerManager();
    const member = await registerMember(manager.joinCode);
    const a = await createChallenge(manager.token, publicChallenge({ title: 'קריאת ספרים', endDate: '2026-11-20' }));
    await createChallenge(manager.token, publicChallenge({ title: 'ריצה', scale: 'RATING', startDate: '2026-11-05', endDate: '2026-11-08' }));
    await createChallenge(manager.token, publicChallenge({ title: 'שתיית מים', endDate: '2026-11-03', joinWindowDays: 1 }));
    await join(member.token, a.id);

    const titles = async (query: string) =>
      (await api().get(`/api/challenges${query}`).set(auth(member.token))).body.map((c: { title: string }) => c.title);

    expect(await titles('?search=ספר')).toEqual(['קריאת ספרים']);
    expect(await titles('?status=UPCOMING')).toEqual(['ריצה']);
    expect(await titles('?status=ACTIVE')).toEqual(['שתיית מים', 'קריאת ספרים']);
    expect(await titles('?scale=RATING')).toEqual(['ריצה']);
    expect(await titles('?joined=true')).toEqual(['קריאת ספרים']);
    expect(await titles('?sort=endDate&order=desc')).toEqual(['קריאת ספרים', 'ריצה', 'שתיית מים']);
    expect((await titles('?sort=participants&order=desc'))[0]).toBe('קריאת ספרים');
    setToday('2026-11-04');
    expect(await titles('?status=ENDED')).toEqual(['שתיית מים']);
    expect((await api().get('/api/challenges?status=SOON').set(auth(member.token))).status).toBe(400);
  });

  it('card shows my status: reported today and missing days', async () => {
    const manager = await registerManager();
    const c = await createChallenge(manager.token, publicChallenge());
    await join(manager.token, c.id);
    setToday('2026-11-04');
    const list = await api().get('/api/challenges').set(auth(manager.token));
    expect(list.body[0].myStatus).toEqual({ reportedToday: false, missingCount: 3 });
  });
});

describe('editing and deleting', () => {
  it('before the start every field (except visibility) can change, and participants move with the start date', async () => {
    const manager = await registerManager();
    const c = await createChallenge(manager.token, publicChallenge({ startDate: '2026-11-05', endDate: '2026-11-20' }));
    await join(manager.token, c.id);
    const res = await api().patch(`/api/challenges/${c.id}`).set(auth(manager.token)).send({ scale: 'RATING', startDate: '2026-11-07', joinWindowDays: 0 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ scale: 'RATING', startDate: '2026-11-07', joinWindowDays: 0 });
    expect(res.body.participants[0].firstDay).toBe('2026-11-07');
    const vis = await api().patch(`/api/challenges/${c.id}`).set(auth(manager.token)).send({ visibility: 'PRIVATE' });
    expect(vis.status).toBe(400);
  });

  it('after the start only title, description, prize and a later end date can change', async () => {
    const manager = await registerManager();
    const c = await createChallenge(manager.token, publicChallenge());
    const locked = await api().patch(`/api/challenges/${c.id}`).set(auth(manager.token)).send({ scale: 'RATING' });
    expect(locked.status).toBe(400);
    expect(locked.body.error.code).toBe('RULE_VIOLATION');
    // sending the same value back is fine (forms send everything)
    const same = await api().patch(`/api/challenges/${c.id}`).set(auth(manager.token)).send({ scale: 'YES_NO', title: 'שם חדש' });
    expect(same.status).toBe(200);
    expect(same.body.title).toBe('שם חדש');
    expect(same.body.editableFields).toEqual(['title', 'description', 'prize', 'endDate']);
    expect((await api().patch(`/api/challenges/${c.id}`).set(auth(manager.token)).send({ endDate: '2026-11-08' })).status).toBe(400);
    expect((await api().patch(`/api/challenges/${c.id}`).set(auth(manager.token)).send({ endDate: '2026-11-15' })).body.endDate).toBe('2026-11-15');
  });

  it('members cannot edit public challenges; nobody can edit an ended one', async () => {
    const manager = await registerManager();
    const member = await registerMember(manager.joinCode);
    const c = await createChallenge(manager.token, publicChallenge({ endDate: '2026-11-02', joinWindowDays: 1 }));
    expect((await api().patch(`/api/challenges/${c.id}`).set(auth(member.token)).send({ title: 'שלי' })).status).toBe(403);
    setToday('2026-11-03');
    expect((await api().patch(`/api/challenges/${c.id}`).set(auth(manager.token)).send({ title: 'מאוחר' })).status).toBe(400);
  });

  it('a public challenge can be deleted only before it starts; a private one always', async () => {
    const manager = await registerManager();
    const member = await registerMember(manager.joinCode);
    const active = await createChallenge(manager.token, publicChallenge());
    const upcoming = await createChallenge(manager.token, publicChallenge({ startDate: '2026-11-03' }));
    const priv = await createChallenge(member.token, { title: 'פרטי', scale: 'YES_NO', visibility: 'PRIVATE', startDate: DAY0, endDate: '2026-11-05' });
    expect((await api().delete(`/api/challenges/${active.id}`).set(auth(manager.token))).status).toBe(400);
    expect((await api().delete(`/api/challenges/${upcoming.id}`).set(auth(member.token))).status).toBe(403);
    expect((await api().delete(`/api/challenges/${upcoming.id}`).set(auth(manager.token))).status).toBe(204);
    expect((await api().delete(`/api/challenges/${priv.id}`).set(auth(member.token))).status).toBe(204);
    expect((await api().get(`/api/challenges/${upcoming.id}`).set(auth(manager.token))).status).toBe(404);
  });
});

describe('joining, leaving and renewing', () => {
  it('join window, double join, private challenges', async () => {
    const manager = await registerManager();
    const member = await registerMember(manager.joinCode);
    const c = await createChallenge(manager.token, publicChallenge({ joinWindowDays: 2 }));
    setToday('2026-11-03');
    const joined = await api().post(`/api/challenges/${c.id}/join`).set(auth(member.token));
    expect(joined.status).toBe(201);
    expect(joined.body.firstDay).toBe('2026-11-03');
    expect((await api().post(`/api/challenges/${c.id}/join`).set(auth(member.token))).status).toBe(409);
    setToday('2026-11-04');
    const late = await api().post(`/api/challenges/${c.id}/join`).set(auth(manager.token));
    expect(late.status).toBe(400);
    expect(late.body.error.code).toBe('RULE_VIOLATION');
    const priv = await createChallenge(member.token, { title: 'פרטי', scale: 'YES_NO', visibility: 'PRIVATE', startDate: '2026-11-04', endDate: '2026-11-05' });
    expect((await api().post(`/api/challenges/${priv.id}/join`).set(auth(member.token))).status).toBe(400);
  });

  it('leaving is allowed only before the start', async () => {
    const manager = await registerManager();
    const c = await createChallenge(manager.token, publicChallenge({ startDate: '2026-11-03' }));
    await join(manager.token, c.id);
    expect((await api().get(`/api/challenges/${c.id}`).set(auth(manager.token))).body.permissions.canLeave).toBe(true);
    expect((await api().delete(`/api/challenges/${c.id}/join`).set(auth(manager.token))).status).toBe(204);
    await join(manager.token, c.id);
    setToday('2026-11-03');
    expect((await api().delete(`/api/challenges/${c.id}/join`).set(auth(manager.token))).status).toBe(400);
  });

  it('renewing an ended challenge links it and suggests dates', async () => {
    const manager = await registerManager();
    const old = await createChallenge(manager.token, publicChallenge({ endDate: '2026-11-05' }));
    expect((await api().post('/api/challenges').set(auth(manager.token)).send(publicChallenge({ previousChallengeId: old.id }))).status).toBe(400);
    setToday('2026-11-10');
    const details = await api().get(`/api/challenges/${old.id}`).set(auth(manager.token));
    expect(details.body.permissions.canRenew).toBe(true);
    expect(details.body.suggestedRenewalDates).toEqual({ startDate: '2026-11-10', endDate: '2026-11-14' });
    const renewed = await createChallenge(manager.token, publicChallenge({ ...details.body.suggestedRenewalDates, previousChallengeId: old.id }));
    expect(renewed.previousChallenge).toEqual({ id: old.id, title: 'קריאה יומית' });
  });
});
