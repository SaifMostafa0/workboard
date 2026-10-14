import { cn } from '@/lib/cn';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Info,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import styles from './Alert.module.css';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  title: string;
  message?: ReactNode;
  children?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

const ALERT_ICONS: Record<AlertType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" aria-hidden="true" />,
  error: <AlertCircle className="w-5 h-5" aria-hidden="true" />,
  warning: <AlertTriangle className="w-5 h-5" aria-hidden="true" />,
  info: <Info className="w-5 h-5" aria-hidden="true" />,
};

const ALERT_ROLES: Record<AlertType, string> = {
  success: 'status',
  error: 'alert',
  warning: 'alert',
  info: 'status',
};

export function Alert({
  type,
  title,
  message,
  children,
  dismissible = false,
  onDismiss,
  collapsible = false,
  defaultExpanded = true,
  className,
}: AlertProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = ALERT_ICONS[type] as React.ReactElement;
  const role = ALERT_ROLES[type];
  const content = message ?? children;

  return (
    <div
      className={cn(styles.alert, styles[type], className)}
      role={role}
      aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
    >
      <div className={cn(styles.iconWrapper, styles[type])} aria-hidden="true">
        {Icon}
      </div>
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        {content && (
          <div className={cn(styles.message, !expanded && styles.collapsed)}>{content}</div>
        )}
        {collapsible && content && (
          <button
            className={styles.toggle}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="alert-message"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{expanded ? 'Show less' : 'Show more'}</span>
          </button>
        )}
      </div>
      {dismissible && (
        <button className={styles.dismissButton} onClick={onDismiss} aria-label="Dismiss alert">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
