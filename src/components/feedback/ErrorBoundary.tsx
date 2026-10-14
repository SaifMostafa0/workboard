import { Button } from '@/components/ui/Button';
import { reportError } from '@/lib/errorReporting';
import { AlertOctagon } from 'lucide-react';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors anywhere below it and shows a recoverable fallback
 * instead of leaving the user on a blank screen.
 *
 * Note: error boundaries do not catch errors thrown in event handlers, async
 * callbacks, or the boundary itself. Errors that do surface here are handed to
 * `reportError`, so a monitoring service can be attached via `setErrorReporter`
 * without touching this component.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className={styles.container} role="alert">
        <AlertOctagon className={styles.icon} aria-hidden="true" />
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.description}>
          An unexpected error stopped this page from rendering. Reloading usually fixes it.
        </p>
        <pre className={styles.details}>{error.message}</pre>
        <Button onClick={this.handleReload}>Reload page</Button>
      </div>
    );
  }
}
