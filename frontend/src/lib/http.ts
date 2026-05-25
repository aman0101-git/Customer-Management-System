// ============================================================================
// frontend/src/lib/http.ts
// ----------------------------------------------------------------------------
// Phase 0 (May 2026):
//   Single shared axios instance for the CMS frontend.
//
//   - baseURL comes from the existing apiBase.ts (env-driven, no hardcoded URLs)
//   - withCredentials: true so the httpOnly JWT cookie is sent on every call
//   - 401 interceptor dispatches a window event ("auth:unauthorized") that the
//     AuthContext listens for and uses to clear client state. We deliberately
//     do NOT navigate from the interceptor; RequireAuth already redirects to
//     /login when user becomes null, and the public /login page must remain
//     reachable for the bad-credentials case.
//
//   Pages that still use raw axios / fetch are unaffected — those will be
//   migrated to this client in later phases, one page at a time.
// ============================================================================

import axios from "axios";
import { API_BASE } from "@/apiBase";

export const http = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Tunable list of URLs that should NOT trigger the global "session lost" event
// even when they return 401. /auth/login returns 401 for bad credentials and
// LoginPage handles that case locally.
const UNAUTHORIZED_EVENT_BLOCKLIST = ["/auth/login"];

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status: number | undefined = err?.response?.status;
    const url: string = err?.config?.url ?? "";

    if (
      status === 401 &&
      !UNAUTHORIZED_EVENT_BLOCKLIST.some((skip) => url.includes(skip))
    ) {
      // Decoupled signal — AuthContext picks it up, clears user/loading.
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    return Promise.reject(err);
  }
);

export default http;
