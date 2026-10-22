import bcrypt from 'bcryptjs';
import { Group, User } from '@prisma/client';
import { prisma } from '../db/prisma';
import { conflict, notFound, unauthorized } from '../lib/errors';
import { MEMBER_COLORS } from '../lib/constants';
import { AuthUser, signToken } from '../middleware/auth';
import { LoginInput, RegisterInput } from '../schemas/auth.schemas';
import { generateUniqueJoinCode, pickColorForGroup } from './group.service';

const BCRYPT_ROUNDS = 10;

/** The user object returned by the API. Never includes the password hash. */
export function toUserDto(user: User, group: Group) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    color: user.color,
    role: group.managerId === user.id ? 'MANAGER' : 'MEMBER',
    group: { id: group.id, name: group.name },
  };
}

export function authUserToDto(user: AuthUser) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    color: user.color,
    role: user.role,
    group: { id: user.groupId, name: user.groupName },
  };
}

/**
 * Creates the user and, in the same transaction, either joins an existing group (joinCode)
 * or creates a new group with the user as its manager (groupName).
 */
export async function register(input: RegisterInput) {
  const taken = await prisma.user.findUnique({ where: { username: input.username } });
  if (taken) throw conflict('שם המשתמש תפוס', [{ field: 'username', message: 'שם המשתמש תפוס, בחרו שם אחר' }]);

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const base = { username: input.username, passwordHash, displayName: input.displayName, avatar: input.avatar };

  const { user, group } = await prisma.$transaction(async (tx) => {
    if (input.joinCode !== undefined) {
      const group = await tx.group.findUnique({ where: { joinCode: input.joinCode.toUpperCase() } });
      if (!group) throw notFound('קוד ההצטרפות לא נמצא', [{ field: 'joinCode', message: 'קוד ההצטרפות לא נמצא' }]);
      const color = await pickColorForGroup(group.id, tx);
      const user = await tx.user.create({ data: { ...base, color, groupId: group.id } });
      return { user, group };
    }
    // New group: create it, create the manager, then link them.
    const joinCode = await generateUniqueJoinCode(tx);
    const created = await tx.group.create({ data: { name: input.groupName!, joinCode } });
    const user = await tx.user.create({ data: { ...base, color: MEMBER_COLORS[0], groupId: created.id } });
    const group = await tx.group.update({ where: { id: created.id }, data: { managerId: user.id } });
    return { user, group };
  });

  return { token: signToken(user.id), user: toUserDto(user, group) };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { username: input.username }, include: { group: true } });
  // Same message for a wrong username and a wrong password, so attackers can't tell which.
  const ok = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !ok) throw unauthorized('שם משתמש או סיסמה שגויים');
  return { token: signToken(user.id), user: toUserDto(user, user.group) };
}
