// Demo data. Run with: npm run db:seed
// All dates are relative to "today", so the demo always shows upcoming, active and ended challenges.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Avatar, PrismaClient, Scale, Visibility } from '@prisma/client';
import { addDays, eachDay, today as getToday, toDbDate } from '../src/lib/dates';
import { MEMBER_COLORS } from '../src/lib/constants';

const prisma = new PrismaClient();

function demoPassword(): string {
  const fromEnv = process.env.SEED_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('In production set SEED_PASSWORD (a private password for the demo accounts) before seeding.');
  }
  return 'Demo1234';
}

async function main() {
  if (await prisma.user.findUnique({ where: { username: 'admin' } })) {
    console.log('Demo data already exists – nothing to do.');
    return;
  }
  const passwordHash = await bcrypt.hash(demoPassword(), 10);
  const T = getToday();

  // ----- Demo group -----
  const group = await prisma.group.create({ data: { name: 'משפחת לוי (הדגמה)', joinCode: 'DEMO2026' } });
  const people: { username: string; displayName: string; avatar: Avatar }[] = [
    { username: 'admin', displayName: 'אבא (מנהל)', avatar: 'LION' },
    { username: 'noa', displayName: 'נועה', avatar: 'OWL' },
    { username: 'dani', displayName: 'דני', avatar: 'ROCKET' },
    { username: 'yossi', displayName: 'יוסי', avatar: 'TURTLE' },
  ];
  const users = [];
  for (const [i, p] of people.entries()) {
    users.push(await prisma.user.create({ data: { ...p, passwordHash, color: MEMBER_COLORS[i], groupId: group.id } }));
  }
  const [admin, noa, dani, yossi] = users;
  await prisma.group.update({ where: { id: group.id }, data: { managerId: admin.id } });

  // ----- Second group, to show that groups can't see each other -----
  const other = await prisma.group.create({ data: { name: 'קבוצה אחרת (הדגמה)', joinCode: 'OTHER123' } });
  const otherUser = await prisma.user.create({
    data: { username: 'other', displayName: 'משתמש מקבוצה אחרת', avatar: 'CAT', passwordHash, color: MEMBER_COLORS[0], groupId: other.id },
  });
  await prisma.group.update({ where: { id: other.id }, data: { managerId: otherUser.id } });

  async function challenge(data: {
    title: string; description?: string; scale: Scale; visibility: Visibility; start: number; end: number;
    prize?: string; joinWindowDays?: number; creatorId: number; groupId?: number; previousChallengeId?: number;
  }) {
    return prisma.challenge.create({
      data: {
        groupId: data.groupId ?? group.id,
        creatorId: data.creatorId,
        title: data.title,
        description: data.description ?? null,
        scale: data.scale,
        visibility: data.visibility,
        startDate: toDbDate(addDays(T, data.start)),
        endDate: toDbDate(addDays(T, data.end)),
        prize: data.prize ?? null,
        joinWindowDays: data.joinWindowDays ?? null,
        previousChallengeId: data.previousChallengeId ?? null,
      },
    });
  }

  /** Adds a participant and reports from firstDay to lastDay, skipping the days in `gaps`. */
  async function participate(challengeId: number, userId: number, scale: Scale, firstOffset: number, lastOffset: number | null, gaps: number[] = [], seed = 1) {
    await prisma.participant.create({ data: { challengeId, userId, firstDay: toDbDate(addDays(T, firstOffset)) } });
    if (lastOffset === null || lastOffset < firstOffset) return;
    const rows = eachDay(addDays(T, firstOffset), addDays(T, lastOffset))
      .map((date, i) => ({ date, i }))
      .filter(({ i }) => !gaps.includes(i + firstOffset))
      .map(({ date, i }) => {
        const pseudo = (i * 7 + seed * 3) % 10; // deterministic "random" pattern
        const value = scale === 'YES_NO' ? (pseudo < 7 ? 1 : 0) : Math.max(1, Math.min(10, 4 + pseudo / 1.5)) | 0;
        return { challengeId, userId, date: toDbDate(date), value, skipped: false };
      });
    await prisma.report.createMany({ data: rows });
  }

  // 1. Active public challenge (yes/no). Dani has missing days, so his results are locked.
  const reading = await challenge({
    title: '20 דפים ביום', description: 'כל אחד קורא ספר לבחירתו – לפחות 20 עמודים ביום.',
    scale: 'YES_NO', visibility: 'PUBLIC', start: -10, end: 20, prize: 'ארוחת בוקר במסעדה', joinWindowDays: 5, creatorId: admin.id,
  });
  await participate(reading.id, admin.id, 'YES_NO', -10, -1, [], 1);
  await participate(reading.id, noa.id, 'YES_NO', -10, 0, [], 2);
  await participate(reading.id, dani.id, 'YES_NO', -10, -3, [], 3);
  await participate(reading.id, yossi.id, 'YES_NO', -6, -1, [], 4);

  // 2. Ended public challenge (rating) – shows winners.
  const water = await challenge({
    title: 'שתיית 8 כוסות מים', description: 'דרגו מ-1 עד 10 כמה הצלחתם לשתות.',
    scale: 'RATING', visibility: 'PUBLIC', start: -40, end: -11, prize: 'כרטיס לסרט', joinWindowDays: 3, creatorId: admin.id,
  });
  await participate(water.id, admin.id, 'RATING', -40, -11, [-30, -29], 5);
  await participate(water.id, noa.id, 'RATING', -40, -11, [], 6);
  await participate(water.id, dani.id, 'RATING', -38, -11, [-20], 7);

  // 3. Renewal of challenge 2 (active, linked to the previous one).
  const water2 = await challenge({
    title: 'שתיית 8 כוסות מים – סבב 2', scale: 'RATING', visibility: 'PUBLIC', start: -3, end: 26,
    prize: 'כרטיס לסרט', joinWindowDays: 3, creatorId: admin.id, previousChallengeId: water.id,
  });
  await participate(water2.id, noa.id, 'RATING', -3, -1, [], 8);
  await participate(water2.id, admin.id, 'RATING', -3, 0, [], 9);

  // 4. Upcoming public challenge – people can still join or leave.
  const running = await challenge({
    title: 'ריצת בוקר', description: 'לפחות 15 דקות ריצה או הליכה מהירה.',
    scale: 'YES_NO', visibility: 'PUBLIC', start: 3, end: 30, prize: 'נעלי ספורט', joinWindowDays: 2, creatorId: admin.id,
  });
  await participate(running.id, yossi.id, 'YES_NO', 3, null);

  // 5. Noa's private challenge – only she can see it.
  const gratitude = await challenge({ title: 'יומן תודה', description: 'לכתוב 3 דברים טובים מהיום.', scale: 'YES_NO', visibility: 'PRIVATE', start: -7, end: 7, creatorId: noa.id });
  await participate(gratitude.id, noa.id, 'YES_NO', -7, -1, [], 10);

  // 6. A challenge in the other group.
  await challenge({ title: 'אתגר של קבוצה אחרת', scale: 'YES_NO', visibility: 'PUBLIC', start: -2, end: 10, joinWindowDays: 2, creatorId: otherUser.id, groupId: other.id });

  console.log('Demo data created.');
  console.log('Users: admin (manager), noa, dani, yossi – group code DEMO2026; other – a separate group.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
