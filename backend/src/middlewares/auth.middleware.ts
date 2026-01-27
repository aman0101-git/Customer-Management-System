import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) return res.sendStatus(401);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = payload;
    next();
  } catch {
    res.sendStatus(401);
  }
}
