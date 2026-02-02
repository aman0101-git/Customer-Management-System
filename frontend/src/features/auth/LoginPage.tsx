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

      // 1️⃣ Login → sets cookie
      await login({ username, password });

      // 2️⃣ Fetch identity ONCE
      const loggedInUser = await refreshUser();

      if (!loggedInUser) {
        throw new Error("Auth failed");
      }

      // 3️⃣ Redirect by role
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
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-2">
        AMS <span className="text-blue-600">Login</span>
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g., FCS0001"
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
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          disabled={loading}
        >
          {loading ? "Logging in…" : "Login"}
        </Button>
      </form>
    </>
  );
}
