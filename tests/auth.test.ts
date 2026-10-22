import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { api, auth, registerManager, registerMember, useCleanDatabase } from './helpers';

useCleanDatabase();

describe('general endpoints', () => {
  it('GET /api/health reports server and database status', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
  });

  it('GET /api/meta returns the 30 avatars and the scales', async () => {
    const res = await api().get('/api/meta');
    expect(res.status).toBe(200);
    expect(res.body.avatars).toHaveLength(30);
    expect(res.body.scales.map((s: { key: string }) => s.key)).toEqual(['YES_NO', 'RATING']);
  });

  it('GET /api/quotes/today returns a sentence', async () => {
    const res = await api().get('/api/quotes/today');
    expect(res.status).toBe(200);
    expect(res.body.text.length).toBeGreaterThan(5);
  });

  it('unknown API address returns 404 in the uniform error shape', async () => {
    const res = await api().get('/api/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('registration', () => {
  it('creating a group makes the user its manager and returns a token', async () => {
    const res = await api().post('/api/auth/register').send({ username: 'Dad_1', password: 'Secret123', displayName: 'אבא', avatar: 'LION', groupName: 'משפחת כהן' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user).toMatchObject({ username: 'dad_1', role: 'MANAGER', group: { name: 'משפחת כהן' } });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('joining with a code (any letter case) makes a member with a different color', async () => {
    const manager = await registerManager();
    const member = await registerMember(manager.joinCode.toLowerCase());
    expect(member.user.role).toBe('MEMBER');
    expect(member.user.group.id).toBe(manager.user.group.id);
    expect(member.user.color).not.toBe(manager.user.color);
  });

  it('an unknown join code returns 404 with a field error', async () => {
    const res = await api().post('/api/auth/register').send({ username: 'abc', password: 'Secret123', displayName: 'אבג', avatar: 'CAT', joinCode: 'NOPE99' });
    expect(res.status).toBe(404);
    expect(res.body.error.details[0].field).toBe('joinCode');
  });

  it('a taken username returns 409', async () => {
    const manager = await registerManager();
    const res = await api().post('/api/auth/register').send({ username: manager.username, password: 'Secret123', displayName: 'שוב', avatar: 'CAT', groupName: 'עוד קבוצה' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('validates fields: weak password, bad avatar, both code and group name', async () => {
    const res = await api().post('/api/auth/register').send({ username: 'x!', password: 'short', displayName: 'א', avatar: 'DRAGON', joinCode: 'ABCDEF', groupName: 'קבוצה' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['username', 'password', 'displayName', 'avatar']));
  });

  it('requires a join code or a group name', async () => {
    const res = await api().post('/api/auth/register').send({ username: 'lonely', password: 'Secret123', displayName: 'בודד', avatar: 'CAT' });
    expect(res.status).toBe(400);
  });
});

describe('login and token checks', () => {
  it('logs in with correct details', async () => {
    const manager = await registerManager();
    const res = await api().post('/api/auth/login').send({ username: manager.username.toUpperCase(), password: 'Secret123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('MANAGER');
  });

  it('rejects a wrong password and an unknown user with the same 401 message', async () => {
    const manager = await registerManager();
    const wrong = await api().post('/api/auth/login').send({ username: manager.username, password: 'Wrong1234' });
    const unknown = await api().post('/api/auth/login').send({ username: 'ghost', password: 'Wrong1234' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('GET /api/auth/me works with a token', async () => {
    const manager = await registerManager();
    const res = await api().get('/api/auth/me').set(auth(manager.token));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(manager.user.id);
  });

  it('returns 401 without a token', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for a malformed token or a token signed with another secret', async () => {
    expect((await api().get('/api/auth/me').set(auth('not-a-token'))).status).toBe(401);
    const forged = jwt.sign({ sub: '1' }, 'some-other-secret-some-other-secret-123');
    expect((await api().get('/api/auth/me').set(auth(forged))).status).toBe(401);
  });

  it('returns 401 for an expired token', async () => {
    const manager = await registerManager();
    const expired = jwt.sign({ sub: String(manager.user.id), exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET!);
    const res = await api().get('/api/auth/me').set(auth(expired));
    expect(res.status).toBe(401);
  });
});
