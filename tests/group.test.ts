import { describe, expect, it } from 'vitest';
import { api, auth, createChallenge, registerManager, registerMember, useCleanDatabase } from './helpers';

useCleanDatabase();

describe('group', () => {
  it('only the manager sees the join code; everyone sees the members', async () => {
    const manager = await registerManager();
    const member = await registerMember(manager.joinCode, 'נועה');
    const asManager = await api().get('/api/group').set(auth(manager.token));
    const asMember = await api().get('/api/group').set(auth(member.token));
    expect(asManager.body.joinCode).toBe(manager.joinCode);
    expect(asMember.body).not.toHaveProperty('joinCode');
    expect(asMember.body.members).toHaveLength(2);
    expect(asMember.body.members.find((m: { isManager: boolean }) => m.isManager).id).toBe(manager.user.id);
  });

  it('members cannot rename the group or change the code (403)', async () => {
    const manager = await registerManager();
    const member = await registerMember(manager.joinCode);
    expect((await api().patch('/api/group').set(auth(member.token)).send({ name: 'שם חדש' })).status).toBe(403);
    expect((await api().post('/api/group/join-code').set(auth(member.token)).send({ mode: 'random' })).status).toBe(403);
    expect((await api().post('/api/group/transfer-manager').set(auth(member.token)).send({ userId: member.user.id })).status).toBe(403);
  });

  it('the manager renames the group', async () => {
    const manager = await registerManager();
    const res = await api().patch('/api/group').set(auth(manager.token)).send({ name: 'שם חדש' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('שם חדש');
  });

  it('a custom code replaces the old one; taken or invalid codes are rejected', async () => {
    const manager = await registerManager();
    const other = await registerManager('קבוצה אחרת');
    const res = await api().post('/api/group/join-code').set(auth(manager.token)).send({ mode: 'custom', code: 'cohen2026' });
    expect(res.status).toBe(200);
    expect(res.body.joinCode).toBe('COHEN2026');
    // the old code no longer works
    const late = await api().post('/api/auth/register').send({ email: 'late1@example.com', password: 'Secret123', displayName: 'מאחר', avatar: 'CAT', joinCode: manager.joinCode });
    expect(late.status).toBe(404);
    // taken
    const taken = await api().post('/api/group/join-code').set(auth(other.token)).send({ mode: 'custom', code: 'COHEN2026' });
    expect(taken.status).toBe(409);
    // invalid
    const invalid = await api().post('/api/group/join-code').set(auth(other.token)).send({ mode: 'custom', code: 'ab-1' });
    expect(invalid.status).toBe(400);
  });

  it('a random code is 6 characters and different from the old one', async () => {
    const manager = await registerManager();
    const res = await api().post('/api/group/join-code').set(auth(manager.token)).send({ mode: 'random' });
    expect(res.body.joinCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(res.body.joinCode).not.toBe(manager.joinCode);
  });

  it('transferring management swaps the roles immediately', async () => {
    const manager = await registerManager();
    const member = await registerMember(manager.joinCode);
    const res = await api().post('/api/group/transfer-manager').set(auth(manager.token)).send({ userId: member.user.id });
    expect(res.status).toBe(200);
    expect((await api().get('/api/auth/me').set(auth(member.token))).body.role).toBe('MANAGER');
    expect((await api().get('/api/auth/me').set(auth(manager.token))).body.role).toBe('MEMBER');
    // the former manager lost manager rights
    expect((await api().patch('/api/group').set(auth(manager.token)).send({ name: 'נסיון' })).status).toBe(403);
  });

  it('cannot transfer to yourself or to someone from another group', async () => {
    const manager = await registerManager();
    const stranger = await registerManager('זרים');
    expect((await api().post('/api/group/transfer-manager').set(auth(manager.token)).send({ userId: manager.user.id })).status).toBe(400);
    expect((await api().post('/api/group/transfer-manager').set(auth(manager.token)).send({ userId: stranger.user.id })).status).toBe(404);
  });

  it('challengesCount counts only public challenges', async () => {
    const manager = await registerManager();
    await createChallenge(manager.token, { title: 'פרטי שלי', scale: 'YES_NO', visibility: 'PRIVATE', startDate: '2026-11-01', endDate: '2026-11-05' });
    const res = await api().get('/api/group').set(auth(manager.token));
    expect(res.body.members[0].challengesCount).toBe(0);
  });
});
