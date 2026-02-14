import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches React render errors so the app shows a recovery UI instead of a white screen.
 * Prevents "browser not connecting" / blank page when a component throws.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "#0f172a",
            color: "#e2e8f0",
            textAlign: "center",
          }}
        >
          <h1 style={{ color: "#f87171", marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#94a3b8", marginBottom: 16, maxWidth: 420 }}>
            The app crashed. Try reloading. If it keeps happening, check the browser console and the terminal.
          </p>
          <pre
            style={{
              background: "#1e293b",
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              color: "#fca5a5",
              overflow: "auto",
              maxWidth: "100%",
              marginBottom: 24,
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: "#3b82f6",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
