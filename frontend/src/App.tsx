import './App.css'
import { Toaster } from "sonner";
import AppRoutes from "./app/routes/AppRoutes";
import { AuthProvider } from "@/context/AuthContext";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import ThemeProvider from "@/components/system/ThemeProvider";
import QueryProvider from "@/components/system/QueryProvider";

// Phase 0 (May 2026):
//   - <ErrorBoundary> wraps only <AppRoutes/>. AuthProvider stays above it so
//     a page-level render error never destroys the auth context we already
//     paid a round-trip for.
//   - <Toaster/> is mounted once at the root.
//
// Phase 1 (May 2026):
//   - <ThemeProvider> wraps everything so /login is themeable too. Default is
//     light; users opt into dark via the ThemeToggle in the AppShell header.
//
// Phase 2 (May 2026):
//   - <QueryProvider> sits between ThemeProvider and AuthProvider so /login
//     and every protected route share the same QueryClient. AuthProvider is
//     inside so an auth state change does not blow away the cache.
export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
          <Toaster richColors position="top-right" closeButton />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
