import { cn } from '@/lib/cn';
import { X } from 'lucide-react';
import { Fragment, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Save trigger element when dialog opens
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // Focus management
  useEffect(() => {
    if (!open) return;

    const content = contentRef.current;
    if (!content) return;

    // Focus first focusable element
    const focusableElements = content.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Small delay to allow render
    setTimeout(() => firstFocusable?.focus(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Restore focus on close
  useEffect(() => {
    if (!open && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [open]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <Fragment>
      <div className={styles.overlay} ref={overlayRef} onClick={onClose} aria-hidden="true" />
      <div
        ref={contentRef}
        className={cn(styles.content, styles[size])}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className={styles.description}>
              {description}
            </p>
          )}
          {showCloseButton && (
            <button className={styles.closeButton} onClick={onClose} aria-label="Close dialog">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </Fragment>,
    document.body
  );
}
