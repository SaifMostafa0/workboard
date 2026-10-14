import { cn } from '@/lib/cn';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" aria-hidden="true" />,
  error: <AlertCircle className="w-5 h-5" aria-hidden="true" />,
  warning: <AlertTriangle className="w-5 h-5" aria-hidden="true" />,
  info: <Info className="w-5 h-5" aria-hidden="true" />,
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'var(--color-success)',
  error: 'var(--color-error)',
  warning: 'var(--color-warning)',
  info: 'var(--color-primary)',
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = TOAST_ICONS[toast.type] as React.ReactElement;
  const color = TOAST_COLORS[toast.type];
  // Errors and warnings should interrupt the user; anything else can wait.
  const isAssertive = toast.type === 'error' || toast.type === 'warning';

  useEffect(() => {
    if (toast.duration !== 0 && toast.duration !== Infinity) {
      const timer = setTimeout(onClose, toast.duration ?? 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onClose]);

  return (
    <div
      className={cn(styles.toast, styles[toast.type])}
      style={{ '--toast-color': color } as React.CSSProperties}
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
    >
      <div className={styles.iconWrapper} style={{ color }} aria-hidden="true">
        {Icon}
      </div>
      <div className={styles.content}>
        <p className={styles.title}>{toast.title}</p>
        {toast.message && <p className={styles.message}>{toast.message}</p>}
      </div>
      {toast.action && (
        <button
          className={styles.action}
          onClick={() => {
            toast.action!.onClick();
            onClose();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button className={styles.closeButton} onClick={onClose} aria-label="Dismiss notification">
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return createPortal(
    // Each toast is its own live region so urgency (assertive vs polite) can
    // differ per notification; a live region on the container would announce
    // everything politely and duplicate the per-item announcements.
    <div className={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>,
    document.body
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Convenience hooks
export function useToastHelpers() {
  const { addToast } = useToast();

  return {
    success: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'success', title, message, ...options }),
    error: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'error', title, message, ...options }),
    warning: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'warning', title, message, ...options }),
    info: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'info', title, message, ...options }),
  };
}
