import { cn } from '@/lib/cn';
import styles from './TagFilter.module.css';

export interface TagFilterProps {
  /** Every tag currently in use, sorted. */
  tags: string[];
  /** Tags currently selected (multi-select). */
  selected: string[];
  onChange: (tags: string[]) => void;
}

/**
 * A multi-select tag filter rendered as toggle chips. Chips keep the control
 * keyboard reachable (each is a real button with `aria-pressed`) while allowing
 * more than one tag to be active at once — which a native single `<select>`
 * cannot express.
 */
export function TagFilter({ tags, selected, onChange }: TagFilterProps) {
  if (tags.length === 0) return null;

  const toggle = (tag: string) => {
    onChange(
      selected.includes(tag) ? selected.filter((value) => value !== tag) : [...selected, tag]
    );
  };

  return (
    <div className={styles.container}>
      <span className={styles.label} id="tag-filter-label">
        Tags
      </span>
      <div className={styles.chips} role="group" aria-labelledby="tag-filter-label">
        {tags.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              className={cn(styles.chip, active && styles.chipActive)}
              aria-pressed={active}
              onClick={() => toggle(tag)}
            >
              {tag}
            </button>
          );
        })}
        {selected.length > 0 && (
          <button type="button" className={styles.clear} onClick={() => onChange([])}>
            Clear tags
          </button>
        )}
      </div>
    </div>
  );
}
