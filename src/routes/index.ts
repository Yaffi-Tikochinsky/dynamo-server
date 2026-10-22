import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler as h } from '../middleware/asyncHandler';
import { requireAuth, requireManager } from '../middleware/auth';
import { env } from '../config/env';
import * as metaController from '../controllers/meta.controller';
import * as authController from '../controllers/auth.controller';
import * as groupController from '../controllers/group.controller';
import * as challengeController from '../controllers/challenge.controller';

export const apiRouter = Router();

// Limits login/register attempts to make password guessing harder.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'יותר מדי ניסיונות, נסו שוב בעוד כמה דקות' } },
});

// General
apiRouter.get('/health', h(metaController.health));
apiRouter.get('/meta', h(metaController.meta));
apiRouter.get('/quotes/today', h(metaController.todayQuote));

// Authentication
apiRouter.post('/auth/register', authLimiter, h(authController.register));
apiRouter.post('/auth/login', authLimiter, h(authController.login));
apiRouter.get('/auth/me', requireAuth, h(authController.me));

// Group
apiRouter.get('/group', requireAuth, h(groupController.getGroup));
apiRouter.patch('/group', requireAuth, requireManager, h(groupController.renameGroup));
apiRouter.post('/group/join-code', requireAuth, requireManager, h(groupController.changeJoinCode));
apiRouter.post('/group/transfer-manager', requireAuth, requireManager, h(groupController.transferManager));

// Challenges
apiRouter.get('/challenges', requireAuth, h(challengeController.list));
apiRouter.post('/challenges', requireAuth, h(challengeController.create));
apiRouter.get('/challenges/:id', requireAuth, h(challengeController.details));
apiRouter.patch('/challenges/:id', requireAuth, h(challengeController.update));
apiRouter.delete('/challenges/:id', requireAuth, h(challengeController.remove));
apiRouter.post('/challenges/:id/join', requireAuth, h(challengeController.join));
apiRouter.delete('/challenges/:id/join', requireAuth, h(challengeController.leave));

// Reports and results
apiRouter.get('/challenges/:id/pending', requireAuth, h(challengeController.pending));
apiRouter.post('/challenges/:id/reports', requireAuth, h(challengeController.submitReports));
apiRouter.get('/challenges/:id/leaderboard', requireAuth, h(challengeController.leaderboard));
apiRouter.get('/challenges/:id/progress', requireAuth, h(challengeController.progress));
