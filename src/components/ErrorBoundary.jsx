import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[Work3Labs] Uncaught error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">

          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#111] flex items-center justify-center">
              <img
                src="/logo.jpg"
                alt="Work3Labs"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <h1 className="text-lg font-semibold">Something went wrong</h1>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              An unexpected error occurred. Try refreshing — if it keeps happening, clear your browser cache.
            </p>
          </div>

          {/* Error detail (dev only) */}
          {import.meta.env.DEV && this.state.error && (
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-left">
              <p className="text-xs font-mono text-destructive break-all">
                {this.state.error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="w-full h-10 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Go to Dashboard
            </button>
          </div>

        </div>
      </div>
    );
  }
}
