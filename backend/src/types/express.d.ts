import type { UserRole } from "../modules/auth/auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: UserRole;
      };
      /**
       * Phase 9: Unique request correlation ID attached by requestId middleware.
       * Present on every request. Echoed in X-Request-ID response header.
       */
      requestId: string;
    }
  }
}

export {};
