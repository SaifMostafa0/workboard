import { cn } from '@/lib/cn';
import type { InputHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, required, id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={styles.field}>
        {label && (
          <label htmlFor={id} className={styles.label}>
            {label}
            {required && (
              <span className={styles.required} aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(styles.input, error && styles.inputError, className)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          aria-required={required}
          {...props}
        />
        {error && (
          <p id={errorId} className={styles.error} role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className={styles.hint}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
