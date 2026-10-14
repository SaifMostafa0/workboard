import { cn } from '@/lib/cn';
import type { ComponentPropsWithoutRef, ElementType, ReactElement, ReactNode } from 'react';
import { cloneElement, forwardRef, isValidElement } from 'react';
import styles from './Button.module.css';

type ButtonOwnProps = {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  asChild?: boolean;
};

export type ButtonProps<C extends ElementType = 'button'> = ButtonOwnProps &
  Omit<ComponentPropsWithoutRef<C>, keyof ButtonOwnProps | 'ref'> & { as?: C };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      disabled,
      children,
      asChild,
      as: Component,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      styles.button,
      styles[variant],
      styles[size],
      loading && styles.loading,
      className
    );

    const wrapContent = (inner: ReactNode) => (
      <>
        {loading && <span className={styles.spinner} aria-hidden="true" />}
        <span className={cn(loading && styles.hidden)}>{inner}</span>
      </>
    );

    // When asChild is set, render the provided child (e.g. a Link) and merge
    // the button styles/props onto it instead of nesting inside a <button>.
    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ className?: string; children?: ReactNode }>;
      return cloneElement(
        child,
        {
          ...props,
          ref,
          className: cn(classes, child.props.className),
          'aria-busy': loading || undefined,
        } as Record<string, unknown>,
        wrapContent(child.props.children)
      );
    }

    const Comp = (Component ?? 'button') as ElementType;
    const isButton = Comp === 'button';

    const baseProps = {
      ref,
      className: classes,
      disabled: isButton ? disabled || loading : disabled,
      'aria-busy': loading,
      // Default to type="button" for real <button>s, but let callers override
      // it (e.g. type="submit") since ...props is spread afterwards.
      ...(isButton ? { type: 'button' as const } : {}),
      ...props,
    };

    return <Comp {...baseProps}>{wrapContent(children)}</Comp>;
  }
);

Button.displayName = 'Button';
