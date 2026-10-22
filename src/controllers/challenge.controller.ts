import { Request, Response } from 'express';
import { idParam, parse } from '../lib/validation';
import { createChallengeSchema, listChallengesQuerySchema, updateChallengeSchema } from '../schemas/challenge.schemas';
import { submitReportsSchema } from '../schemas/report.schemas';
import * as challengeService from '../services/challenge.service';
import * as reportService from '../services/report.service';
import * as resultsService from '../services/results.service';
import { currentUser } from '../middleware/auth';

const challengeId = (req: Request) => parse(idParam, req.params).id;

export async function list(req: Request, res: Response) {
  const query = parse(listChallengesQuerySchema, req.query);
  res.json(await challengeService.listChallenges(currentUser(req), query));
}

export async function create(req: Request, res: Response) {
  const input = parse(createChallengeSchema, req.body);
  res.status(201).json(await challengeService.createChallenge(currentUser(req), input));
}

export async function details(req: Request, res: Response) {
  res.json(await challengeService.getChallengeDetails(challengeId(req), currentUser(req)));
}

export async function update(req: Request, res: Response) {
  const id = challengeId(req);
  const input = parse(updateChallengeSchema, req.body);
  res.json(await challengeService.updateChallenge(id, currentUser(req), input));
}

export async function remove(req: Request, res: Response) {
  await challengeService.deleteChallenge(challengeId(req), currentUser(req));
  res.status(204).end();
}

export async function join(req: Request, res: Response) {
  res.status(201).json(await challengeService.joinChallenge(challengeId(req), currentUser(req)));
}

export async function leave(req: Request, res: Response) {
  await challengeService.leaveChallenge(challengeId(req), currentUser(req));
  res.status(204).end();
}

export async function pending(req: Request, res: Response) {
  res.json(await reportService.getPending(challengeId(req), currentUser(req)));
}

export async function submitReports(req: Request, res: Response) {
  const id = challengeId(req);
  const input = parse(submitReportsSchema, req.body);
  res.status(201).json(await reportService.submitReports(id, currentUser(req), input));
}

export async function leaderboard(req: Request, res: Response) {
  res.json(await resultsService.getLeaderboard(challengeId(req), currentUser(req)));
}

export async function progress(req: Request, res: Response) {
  res.json(await resultsService.getProgress(challengeId(req), currentUser(req)));
}
