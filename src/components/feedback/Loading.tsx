import { cn } from '@/lib/cn';
import styles from './Loading.module.css';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function Loading({ size = 'md', className, label }: LoadingProps) {
  return (
    <div
      className={cn(styles.container, className)}
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading'}
    >
      <div className={cn(styles.spinner, styles[size])} aria-hidden="true" />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  label?: string;
}

export function LoadingOverlay({ isLoading, children, label }: LoadingOverlayProps) {
  return (
    <div className={styles.overlayContainer} style={{ position: 'relative' }}>
      {children}
      {isLoading && (
        <div
          className={styles.overlay}
          role="status"
          aria-live="polite"
          aria-label={label || 'Loading'}
        >
          <div className={cn(styles.spinner, styles.md)} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number;
}

export function Skeleton({
  variant = 'text',
  width = '100%',
  height,
  className,
  lines = 1,
}: SkeletonProps) {
  if (variant === 'text') {
    return (
      <div
        className={cn(styles.skeleton, styles.text, className)}
        style={{ width }}
        aria-hidden="true"
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={styles.line}
            style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div
        className={cn(styles.skeleton, styles.circular, className)}
        style={{ width, height: height || width }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={cn(styles.skeleton, styles.rectangular, className)}
      style={{ width, height: height || '1rem' }}
      aria-hidden="true"
    />
  );
}
