import { Request, Response } from 'express';
import { Avatar, Scale } from '@prisma/client';
import { prisma } from '../db/prisma';
import { AVATAR_EMOJI, LIMITS, QUOTES, SCALE_LABELS, SCALE_MAX } from '../lib/constants';
import { diffDays, today } from '../lib/dates';

export async function health(_req: Request, res: Response) {
  let db = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'error';
  }
  res.status(db === 'ok' ? 200 : 503).json({ status: db === 'ok' ? 'ok' : 'degraded', db, time: new Date().toISOString() });
}

export async function meta(_req: Request, res: Response) {
  res.json({
    avatars: Object.values(Avatar).map((key) => ({ key, emoji: AVATAR_EMOJI[key] })),
    scales: Object.values(Scale).map((key) => ({ key, label: SCALE_LABELS[key], max: SCALE_MAX[key] })),
    visibilities: ['PUBLIC', 'PRIVATE'],
    statuses: ['UPCOMING', 'ACTIVE', 'ENDED'],
    limits: LIMITS,
  });
}

export async function todayQuote(_req: Request, res: Response) {
  const day = today();
  const index = ((diffDays('2026-01-01', day) % QUOTES.length) + QUOTES.length) % QUOTES.length;
  res.json({ date: day, text: QUOTES[index] });
}
