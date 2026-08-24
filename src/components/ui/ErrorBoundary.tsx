import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { ShieldAlert } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/'; // Reset by going to root
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Unexpected Application Error</h2>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                An unexpected error occurred in the application. We apologize for the inconvenience.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-left">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Error Details</span>
                <span className="block text-xs font-mono text-slate-700 mt-1 break-all select-all">
                  {this.state.error.message || String(this.state.error)}
                </span>
              </div>
            )}

            <Button onClick={this.handleReset} className="w-full">
              Recover & Go Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
