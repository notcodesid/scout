import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl border border-border/50 bg-card/50 p-8 text-center backdrop-blur-sm">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
              </div>

              {/* Error Message */}
              <div className="space-y-2">
                <h1 className="text-2xl font-display font-bold text-foreground">
                  Something went wrong
                </h1>
                <p className="text-muted-foreground">
                  We encountered an unexpected error. Don't worry, our team has been notified.
                </p>
              </div>

              {/* Error Details (development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-muted/50 rounded-lg p-4 text-left">
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.handleRefresh}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>

              {/* Support Link */}
              <p className="text-sm text-muted-foreground">
                Need help?{' '}
                <a 
                  href="mailto:support@scout.com" 
                  className="text-primary hover:underline"
                >
                  Contact Support
                </a>
              </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
