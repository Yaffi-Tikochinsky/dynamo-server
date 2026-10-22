import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { conflict, notFound, ruleViolation } from '../lib/errors';
import { JOIN_CODE_ALPHABET, MEMBER_COLORS, RANDOM_JOIN_CODE_LENGTH } from '../lib/constants';
import { AuthUser } from '../middleware/auth';

type Db = Prisma.TransactionClient | typeof prisma;

function randomCode(): string {
  let code = '';
  for (let i = 0; i < RANDOM_JOIN_CODE_LENGTH; i++) code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  return code;
}

/** A random join code that no group uses yet. */
export async function generateUniqueJoinCode(db: Db = prisma): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomCode();
    const taken = await db.group.findUnique({ where: { joinCode: code } });
    if (!taken) return code;
  }
  throw new Error('Could not generate a unique join code');
}

/** The next free color in the group; if all are taken, the least used one. */
export async function pickColorForGroup(groupId: number, db: Db = prisma): Promise<string> {
  const members = await db.user.findMany({ where: { groupId }, select: { color: true } });
  const usage = new Map<string, number>(MEMBER_COLORS.map((c) => [c, 0]));
  for (const m of members) usage.set(m.color, (usage.get(m.color) ?? 0) + 1);
  let best: string = MEMBER_COLORS[0];
  for (const color of MEMBER_COLORS) {
    if ((usage.get(color) ?? 0) < (usage.get(best) ?? 0)) best = color;
  }
  return best;
}

export async function getGroup(user: AuthUser) {
  const group = await prisma.group.findUniqueOrThrow({
    where: { id: user.groupId },
    include: {
      members: {
        orderBy: { displayName: 'asc' },
        include: {
          // Count only public challenges, so private challenges stay private.
          _count: { select: { participations: { where: { challenge: { visibility: 'PUBLIC' } } } } },
        },
      },
    },
  });
  return {
    id: group.id,
    name: group.name,
    ...(user.role === 'MANAGER' ? { joinCode: group.joinCode } : {}),
    members: group.members.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      avatar: m.avatar,
      color: m.color,
      isManager: m.id === group.managerId,
      challengesCount: m._count.participations,
    })),
  };
}

export async function renameGroup(user: AuthUser, name: string) {
  const group = await prisma.group.update({ where: { id: user.groupId }, data: { name } });
  return { id: group.id, name: group.name };
}

export async function changeJoinCode(user: AuthUser, input: { mode: 'random' } | { mode: 'custom'; code: string }) {
  if (input.mode === 'random') {
    const joinCode = await generateUniqueJoinCode();
    await prisma.group.update({ where: { id: user.groupId }, data: { joinCode } });
    return { joinCode };
  }
  const existing = await prisma.group.findUnique({ where: { joinCode: input.code } });
  if (existing && existing.id !== user.groupId) {
    throw conflict('הקוד הזה כבר תפוס, בחרו קוד אחר', [{ field: 'code', message: 'הקוד תפוס' }]);
  }
  await prisma.group.update({ where: { id: user.groupId }, data: { joinCode: input.code } });
  return { joinCode: input.code };
}

export async function transferManager(user: AuthUser, targetUserId: number) {
  if (targetUserId === user.id) throw ruleViolation('אתה כבר המנהל. יש לבחור חבר אחר בקבוצה');
  const target = await prisma.user.findFirst({ where: { id: targetUserId, groupId: user.groupId } });
  if (!target) throw notFound('החבר לא נמצא בקבוצה');
  await prisma.group.update({ where: { id: user.groupId }, data: { managerId: target.id } });
  return { managerId: target.id };
}
