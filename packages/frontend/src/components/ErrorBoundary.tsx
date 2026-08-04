import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './common/Button';
import { AlertTriangleIcon } from './common/icons';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered instead of the default fallback UI when set. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Class component because React only supports catching render errors via
 * the getDerivedStateFromError/componentDidCatch lifecycle — there is no
 * hook equivalent. Catches errors thrown by descendants (including lazy
 * page components) instead of letting them white-screen the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error in patient pages:', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangleIcon className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Something went wrong
          </h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {this.state.error.message || 'This page ran into an unexpected error.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.assign('/')}>
            Go to dashboard
          </Button>
          <Button onClick={this.reset}>Try again</Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
