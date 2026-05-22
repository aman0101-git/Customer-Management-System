// ============================================================================
// PHASE 2 — LoginPage
// ----------------------------------------------------------------------------
// Behaviour preserved 1:1: same login API call, same refreshUser flow, same
// role-based redirect, same error handling.
//
// Visual changes:
//   - Brand mark uses the brand token (was hard-coded blue).
//   - Submit button uses the default <Button> primary (no more bg-purple-600
//     override that didn't match either light or dark mode coherently).
//   - Error notice uses tokenized danger surface.
// ============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "./auth.api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError("Username and password are required");
      return;
    }

    try {
      setLoading(true);
      await login({ username, password });
      const loggedInUser = await refreshUser();
      if (!loggedInUser) throw new Error("Auth failed");

      switch (loggedInUser.role) {
        case "ADMIN":
          navigate("/admin/dashboard", { replace: true });
          break;
        case "SUPERVISOR":
          navigate("/supervisor/dashboard", { replace: true });
          break;
        case "AGENT":
          navigate("/agent/dashboard", { replace: true });
          break;
        default:
          setError("Unknown role");
      }
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
        AMS <span className="text-brand">Login</span>
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Sign in to access your dashboard.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g., FCS0001"
            autoComplete="username"
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="e.g., 1234"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Logging in…" : "Login"}
        </Button>
      </form>
    </>
  );
}
