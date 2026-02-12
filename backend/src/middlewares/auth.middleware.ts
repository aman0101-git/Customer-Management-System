import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
      role: string;
    };

    req.user = {
      id: decoded.userId,
      role: decoded.role as any,
    };

    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
