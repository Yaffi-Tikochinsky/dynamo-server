import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Avatar } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { forbidden, unauthorized } from '../lib/errors';
import { asyncHandler } from './asyncHandler';

export type Role = 'MANAGER' | 'MEMBER';

/** The logged-in user, attached to every authenticated request. */
export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  avatar: Avatar;
  color: string;
  groupId: number;
  groupName: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

/**
 * Requires a valid "Authorization: Bearer <token>" header.
 * The user is loaded from the database on every request, so a role change
 * (manager transfer) takes effect immediately.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) throw unauthorized();

  let userId: number;
  try {
    const payload = jwt.verify(header.slice('Bearer '.length).trim(), env.JWT_SECRET);
    userId = Number(typeof payload === 'object' ? payload.sub : NaN);
  } catch {
    throw unauthorized('ההתחברות פגה או לא תקינה, יש להתחבר מחדש');
  }
  if (!Number.isInteger(userId)) throw unauthorized('ההתחברות פגה או לא תקינה, יש להתחבר מחדש');

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { group: true } });
  if (!user) throw unauthorized('המשתמש לא קיים, יש להתחבר מחדש');

  req.user = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    color: user.color,
    groupId: user.groupId,
    groupName: user.group.name,
    role: user.group.managerId === user.id ? 'MANAGER' : 'MEMBER',
  };
  next();
});

/** Must come after requireAuth. Allows only the group manager. */
export function requireManager(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== 'MANAGER') return next(forbidden('רק מנהל הקבוצה יכול לבצע פעולה זו'));
  next();
}

/** Returns the authenticated user (requireAuth guarantees it exists). */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
