import { cn } from '@/lib/cn';
import type { SelectHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, error, hint, required, options, placeholder, id: providedId, ...props },
    ref
  ) => {
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
        <select
          ref={ref}
          id={id}
          className={cn(styles.select, error && styles.selectError, className)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          aria-required={required}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';
