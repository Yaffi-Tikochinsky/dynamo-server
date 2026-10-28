// Demo data. Run with: npm run db:seed
// All dates are relative to "today", so the demo always shows upcoming, active and ended challenges.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Avatar, PrismaClient, Scale, Visibility } from '@prisma/client';
import { addDays, eachDay, today as getToday, toDbDate } from '../src/lib/dates';
import { MEMBER_COLORS } from '../src/lib/constants';

const prisma = new PrismaClient();

/** In production the demo accounts get a private password (SEED_PASSWORD); without it there is no demo data. */
function demoPassword(): string | null {
  const fromEnv = process.env.SEED_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  return process.env.NODE_ENV === 'production' ? null : 'Demo1234';
}

async function main() {
  const password = demoPassword();
  if (!password) {
    console.log('SEED_PASSWORD is not set – skipping demo data.');
    return;
  }
  if (await prisma.user.findUnique({ where: { email: 'rachely@example.com' } })) {
    console.log('Demo data already exists – nothing to do.');
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const T = getToday();

  // ----- Demo group -----
  const group = await prisma.group.create({ data: { name: 'חברות בנפש✨', joinCode: 'DEMO2026' } });
  const people: { email: string; displayName: string; avatar: Avatar }[] = [
    { email: 'rachely@example.com', displayName: 'רחלי פרידמן', avatar: 'BUTTERFLY' },
    { email: 'chani@example.com', displayName: 'חני ויס', avatar: 'OWL' },
    { email: 'brachy@example.com', displayName: 'ברכי רוזנברג', avatar: 'DOLPHIN' },
    { email: 'miri@example.com', displayName: 'מירי קליין', avatar: 'PANDA' },
  ];
  const users = [];
  for (const [i, p] of people.entries()) {
    users.push(await prisma.user.create({ data: { ...p, passwordHash, color: MEMBER_COLORS[i], groupId: group.id } }));
  }
  const [rachely, chani, brachy, miri] = users;
  await prisma.group.update({ where: { id: group.id }, data: { managerId: rachely.id } });

  // ----- Second group, to show that groups can't see each other -----
  const other = await prisma.group.create({ data: { name: 'משפחת שפירא (הדגמה)', joinCode: 'OTHER123' } });
  const otherUser = await prisma.user.create({
    data: { email: 'other@example.com', displayName: 'משתמש ממשפחה אחרת', avatar: 'CAT', passwordHash, color: MEMBER_COLORS[0], groupId: other.id },
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

  // 1. Active public challenge (yes/no). Brachy has missing days, so her results are locked.
  const halachot = await challenge({
    title: '2 הלכות ביום', description: 'כל אחת לומדת 2 הלכות ביום בספר שמירת הלשון',
    scale: 'YES_NO', visibility: 'PUBLIC', start: -10, end: 20, prize: 'כרטיספר על סך 70 ש"ח', joinWindowDays: 5, creatorId: rachely.id,
  });
  await participate(halachot.id, rachely.id, 'YES_NO', -10, -1, [], 1);
  await participate(halachot.id, chani.id, 'YES_NO', -10, 0, [], 2);
  await participate(halachot.id, brachy.id, 'YES_NO', -10, -3, [], 3);
  await participate(halachot.id, miri.id, 'YES_NO', -6, -1, [], 4);

  // 2. Ended public challenge (rating) – shows winners.
  const shmiratHalashon = await challenge({
    title: 'שמירת הלשון - שעה ביום', description: 'כל אחת בוחרת שעה קבועה ביום של שמירת הלשון ומדרגת עד כמה היא הצליחה!!!',
    scale: 'RATING', visibility: 'PUBLIC', start: -40, end: -11, prize: 'מטען נייד עם הטבעת שם', joinWindowDays: 3, creatorId: rachely.id,
  });
  await participate(shmiratHalashon.id, rachely.id, 'RATING', -40, -11, [-30, -29], 5);
  await participate(shmiratHalashon.id, chani.id, 'RATING', -40, -11, [], 6);
  await participate(shmiratHalashon.id, brachy.id, 'RATING', -38, -11, [-20], 7);

  // 3. Renewal of challenge 2 (active, linked to the previous one).
  const shmiratHalashon2 = await challenge({
    title: 'שמירת הלשון - שעה ביום – סבב 2', description: 'כל אחת בוחרת שעה קבועה ביום של שמירת הלשון ומדרגת עד כמה היא הצליחה!!!',
    scale: 'RATING', visibility: 'PUBLIC', start: -3, end: 26,
    prize: 'מטען נייד עם הטבעת שם', joinWindowDays: 3, creatorId: rachely.id, previousChallengeId: shmiratHalashon.id,
  });
  await participate(shmiratHalashon2.id, chani.id, 'RATING', -3, -1, [], 8);
  await participate(shmiratHalashon2.id, rachely.id, 'RATING', -3, 0, [], 9);

  // 4. Upcoming public challenge – people can still join or leave.
  const sleep = await challenge({
    title: 'שינה בזמן', description: 'עד 2:00 בלילה כולן במיטה!!!!!',
    scale: 'YES_NO', visibility: 'PUBLIC', start: 3, end: 30, prize: "אייס קפה מקפוצ'ינו במשלוח ישיר לסמינר😀", joinWindowDays: 2, creatorId: rachely.id,
  });
  await participate(sleep.id, miri.id, 'YES_NO', 3, null);

  // 5. Chani's private challenge – only she can see it.
  const gratitude = await challenge({ title: 'פנקס הכרת הטוב', description: "לכתוב כל ערב 3 דברים שאני מודה עליהם לה' היום.", scale: 'YES_NO', visibility: 'PRIVATE', start: -7, end: 7, creatorId: chani.id });
  await participate(gratitude.id, chani.id, 'YES_NO', -7, -1, [], 10);

  // 6. A challenge in the other group.
  await challenge({ title: 'שיעור משפחתי בפרשת השבוע', scale: 'YES_NO', visibility: 'PUBLIC', start: -2, end: 10, joinWindowDays: 2, creatorId: otherUser.id, groupId: other.id });

  console.log('Demo data created.');
  console.log('Users: rachely@example.com (manager), chani@, brachy@, miri@example.com – group code DEMO2026; other@example.com – a separate group.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
