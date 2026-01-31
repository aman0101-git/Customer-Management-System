
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (!decoded || !decoded.userId || !decoded.role) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    (req as any).user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
