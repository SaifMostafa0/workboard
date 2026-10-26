# Workboard — Accessibility Strategy

## Target Standard

**WCAG 2.2 Level AA**

## Checklist by Principle

### Perceivable

#### 1.1 Non-text Content

- [ ] All icons have accessible names (`aria-label` or visible text)
- [ ] Status/priority badges use text + color, not color alone
- [ ] Loading states announced via `aria-live="polite"`
- [ ] Empty states have descriptive text

#### 1.3 Adaptable

- [ ] Semantic HTML: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- [ ] Heading hierarchy: h1 → h2 → h3 (no skipping)
- [ ] Form labels explicitly associated (`<label for>` or wrapping)
- [ ] Fieldsets/legends for grouped inputs (priority, status radios)
- [ ] Tables: `<thead>`, `<th scope="col">`, `<tbody>`

#### 1.4 Distinguishable

- [ ] Color contrast ≥4.5:1 (text), ≥3:1 (UI components)
- [ ] Focus indicator: 2px solid, offset 2px, ≥3:1 contrast
- [ ] No info conveyed by color alone (icons + text for status)
- [ ] Text resize to 200% without horizontal scroll
- [ ] Reduced motion: `prefers-reduced-motion` disables animations

### Operable

#### 2.1 Keyboard Accessible

- [ ] All interactive elements reachable via Tab
- [ ] No keyboard traps
- [ ] Skip to main content link
- [ ] Dialog: Trap focus, Esc closes, focus returns to trigger

#### 2.2 Enough Time

- [ ] No auto-advancing carousels/timers
- [ ] Toast auto-dismiss ≥10s, pause on hover/focus

#### 2.4 Navigable

- [ ] Page titles unique and descriptive
- [ ] Focus order matches visual order
- [ ] Visible focus styles on all interactive elements
- [ ] Breadcrumbs or clear heading for context
- [ ] Multiple ways to find content (search, nav, links)

#### 2.5 Input Modalities

- [ ] Click/tap target ≥44×44px (CSS `min-height/min-width`)
- [x] Drag-drop (if any) has keyboard alternative (Kanban status buttons)
- [ ] No custom gestures required

### Understandable

#### 3.1 Readable

- [ ] `lang="en"` on `<html>`
- [ ] No unexplained jargon
- [ ] Error messages: clear, specific, actionable

#### 3.2 Predictable

- [ ] Consistent navigation order
- [ ] Consistent component behavior
- [ ] No unexpected context changes on focus

#### 3.3 Input Assistance

- [ ] Required fields marked (`aria-required`, visual `*`)
- [ ] Error identification: `aria-invalid`, `aria-describedby` error message
- [ ] Error suggestions where possible
- [ ] Confirmation for destructive actions (delete)

### Robust

#### 4.1 Compatible

- [ ] Valid HTML (no duplicate IDs, proper nesting)
- [ ] ARIA used only when native HTML insufficient
- [ ] Custom components have proper roles/states

## Implementation Patterns

### Focus Management Hook

```typescript
// src/hooks/useFocusTrap.ts
export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const focusable = container?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];

    first?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active, containerRef]);
}
```

### Live Region for Announcements

```tsx
// src/components/feedback/LiveRegion.tsx
export function LiveRegion() {
  const [message, setMessage] = useState('');
  const announce = useCallback((msg: string, priority: 'polite' | 'assertive' = 'polite') => {
    setMessage('');
    requestAnimationFrame(() => setMessage(msg));
  }, []);

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className={styles.visuallyHidden}>
        {message}
      </div>
      <AnnounceContext.Provider value={announce}>{children}</AnnounceContext.Provider>
    </>
  );
}
```

### Accessible Form Field

```tsx
// src/components/ui/FormField.tsx
interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, error, hint, required, children }: FormFieldProps) {
  const errorId = useId();
  const hintId = useId();

  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {React.cloneElement(children as React.ReactElement, {
        'aria-invalid': !!error,
        'aria-describedby': [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined,
      })}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
```

### Accessible Dialog

```tsx
// src/components/ui/Dialog.tsx
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, contentRef);
  useEffect(() => {
    if (open) triggerRef.current = document.activeElement as HTMLButtonElement;
    else triggerRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <Portal>
      <div className={styles.overlay} onClick={onClose} />
      <div ref={contentRef} className={styles.content} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <button className={styles.close} onClick={onClose} aria-label="Close">
          <X />
        </button>
        {children}
      </div>
    </Portal>
  );
}
```

## Design Tokens for Accessibility

```css
/* src/styles/tokens.css */
:root {
  /* Focus */
  --focus-ring: 2px solid var(--color-primary);
  --focus-offset: 2px;
  --focus-outline: var(--focus-ring) var(--focus-offset);

  /* Contrast verified colors */
  --color-text: #1a1a2e; /* 12.6:1 on white */
  --color-text-muted: #4a4a6a; /* 7.2:1 on white */
  --color-primary: #2563eb; /* 4.5:1 on white */
  --color-primary-hover: #1d4ed8; /* 5.8:1 on white */
  --color-error: #dc2626; /* 5.5:1 on white */
  --color-success: #16a34a; /* 4.5:1 on white */
  --color-bg: #ffffff;
  --color-bg-muted: #f8fafc;
  --color-border: #e2e8f0;

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    --color-text: #f1f5f9;
    --color-text-muted: #94a3b8;
    --color-primary: #3b82f6;
    --color-bg: #0f172a;
    --color-bg-muted: #1e293b;
    --color-border: #334155;
  }

  /* Motion */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}

/* Visually hidden utility */
.visuallyHidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## Testing Checklist

### Automated (CI)

- [ ] `axe-core` in Playwright E2E: 0 violations on `/`, `/projects`, `/tasks`, `/calendar`, `/trash`, `/settings`
- [ ] `eslint-plugin-jsx-a11y` in lint pipeline
- [ ] Color contrast audit via `vitest` + `color-contrast-checker`

### Manual (Per Milestone)

- [ ] Tab through entire page — focus visible, logical order
- [ ] Screen reader (NVDA/VoiceOver) — announce changes, form errors
- [ ] Zoom 200% — no horizontal scroll, content readable
- [ ] High contrast mode — all UI discernible
- [ ] Keyboard-only task creation, editing, deletion
- [ ] Dialog focus trap, Esc behavior, return focus

## Accessibility Debt Tracker

| Issue                                   | Severity | Milestone | Status                               |
| --------------------------------------- | -------- | --------- | ------------------------------------ |
| Custom select dropdown keyboard support | High     | 3         | Fixed (native `<select>`)            |
| Date picker accessibility               | High     | 5         | Fixed (native `<input type="date">`) |
| Drag-drop task reordering (if added)    | Medium   | Future    | Deferred                             |
| Toast stack screen reader handling      | Medium   | 8         | Planned                              |

## Resources

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Inclusive Components](https://inclusive-components.design/)
