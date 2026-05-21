// ============================================================================
// frontend/src/components/system/ErrorBoundary.tsx
// ----------------------------------------------------------------------------
// Phase 0 (May 2026):
//   Root error boundary for the routed app. Catches uncaught render errors,
//   logs them, and renders a friendly fallback with a Reload button.
//
// Phase 1 (May 2026):
//   Fallback surface tokenized — works correctly in both light and dark
//   modes. Reload button uses the standard primary/elevation tokens.
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
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card text-card-foreground p-8 shadow-elevation-3 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            The page hit an unexpected error. You can reload to try again. If
            the problem persists, please contact your supervisor.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground shadow-elevation-1 hover:bg-primary/90 hover:shadow-elevation-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
