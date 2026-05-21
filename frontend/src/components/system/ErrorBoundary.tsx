// ============================================================================
// frontend/src/components/system/ErrorBoundary.tsx
// ----------------------------------------------------------------------------
// Phase 0 (May 2026):
//   Root error boundary for the routed app.
//
//   Today, an uncaught render error blanks the entire role page for a live
//   agent. This component catches that, logs it, and renders a friendly
//   fallback with a Reload button. It is intentionally a plain class
//   component — no extra runtime dependency.
//
//   Mounted in App.tsx around <AppRoutes/>, INSIDE <AuthProvider/> so that
//   reloading does not throw away auth state we already paid the round-trip
//   for. AuthProvider itself does not throw under normal conditions.
// ============================================================================

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Dev: full stack in console.
    // Prod: this is the integration point for Sentry / your APM.
    // We keep it as console.error for now to avoid introducing a new dep.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            The page hit an unexpected error. You can reload to try again. If
            the problem persists, please contact your supervisor.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
