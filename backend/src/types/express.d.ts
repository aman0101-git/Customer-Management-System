import { UserRole } from "../modules/auth/auth.types";

declare global {
  namespace Express {
    interface User {
      id: number;
      role: UserRole;
      supervisorId?: number;
    }

    interface Request {
      user: User;
    }
  }
}

export {};
