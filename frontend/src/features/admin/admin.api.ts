// ============================================================================
// frontend/src/features/admin/admin.api.ts
// ----------------------------------------------------------------------------
// Phase 0 (May 2026):
//   Migrated to the shared http client. Endpoint, payload shape, role union,
//   and throw-on-failure contract are unchanged. CreateUserForm consumes this
//   without modification.
// ============================================================================

import { http } from "@/lib/http";

export async function createUser(payload: {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: "AGENT" | "SUPERVISOR" | "ADMIN";
}) {
  await http.post("/auth/users", payload);
}
