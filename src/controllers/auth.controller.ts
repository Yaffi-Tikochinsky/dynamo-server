import { Request, Response } from 'express';
import { parse } from '../lib/validation';
import { loginSchema, registerSchema } from '../schemas/auth.schemas';
import * as authService from '../services/auth.service';
import { currentUser } from '../middleware/auth';

export async function register(req: Request, res: Response) {
  const input = parse(registerSchema, req.body);
  res.status(201).json(await authService.register(input));
}

export async function login(req: Request, res: Response) {
  const input = parse(loginSchema, req.body);
  res.json(await authService.login(input));
}

export async function me(req: Request, res: Response) {
  res.json(authService.authUserToDto(currentUser(req)));
}
