import { Request, Response } from 'express';
import { parse } from '../lib/validation';
import { joinCodeSchema, transferManagerSchema, updateGroupSchema } from '../schemas/group.schemas';
import * as groupService from '../services/group.service';
import { currentUser } from '../middleware/auth';

export async function getGroup(req: Request, res: Response) {
  res.json(await groupService.getGroup(currentUser(req)));
}

export async function renameGroup(req: Request, res: Response) {
  const { name } = parse(updateGroupSchema, req.body);
  res.json(await groupService.renameGroup(currentUser(req), name));
}

export async function changeJoinCode(req: Request, res: Response) {
  const input = parse(joinCodeSchema, req.body);
  res.json(await groupService.changeJoinCode(currentUser(req), input));
}

export async function transferManager(req: Request, res: Response) {
  const { userId } = parse(transferManagerSchema, req.body);
  res.json(await groupService.transferManager(currentUser(req), userId));
}
