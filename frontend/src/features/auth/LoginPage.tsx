// ============================================================================
// PHASE 5 — LoginPage
// ----------------------------------------------------------------------------
// Branding refresh: text + icon CMS mark on the left, ThemeToggle on the right.
// Form behaviour and error-handling preserved byte-equivalent from Phase 2.
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
      <div className="space-y-2 mb-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-brand via-brand to-chart-4 dark:from-brand dark:via-brand/80 dark:to-chart-4/80 bg-clip-text text-transparent">
            CMS LOGIN
          </span>
        </h1>
      </div>
      <p className="text-base text-muted-foreground mb-8 leading-relaxed text-center">
        Access your dashboard securely.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2.5">
          <Label htmlFor="username" className="text-sm font-medium">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g., FCS0001"
            autoComplete="username"
            className="h-10"
          />
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="e.g., 1234"
            autoComplete="current-password"
            className="h-10"
          />
        </div>

        {error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger mt-2">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full mt-6" size="lg" disabled={loading}>
          {loading ? "Logging in…" : "Login"}
        </Button>
      </form>
    </>
  );
}
