"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-5 p-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">Something went wrong</p>
            <p className="text-sm text-white/40 mt-1 max-w-xs">
              {this.state.error.message || "An unexpected error occurred."}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
