// ============================================================================
// frontend/src/features/auth/auth.api.ts
// ----------------------------------------------------------------------------
// Phase 0 (May 2026):
//   Migrated to the shared http client. Behavior is identical:
//     - same endpoint (POST /auth/login)
//     - same payload
//     - same cookie semantics (withCredentials is set on the http instance)
//     - same throw-on-failure contract (LoginPage's catch block keeps working)
// ============================================================================

import type { LoginRequest } from "@/contracts/auth";
import { http } from "@/lib/http";

export async function login(payload: LoginRequest): Promise<void> {
  await http.post("/auth/login", payload);
}
