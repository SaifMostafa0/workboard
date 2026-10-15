import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { TaskOption } from '@/domain/dependency';
import { indexTasksById, wouldCreateDependencyCycle } from '@/domain/dependency';
import { X } from 'lucide-react';
import styles from './BlockerPicker.module.css';

export interface BlockerPickerProps {
  /** Every active task, as lightweight options (id, title, status, blockers). */
  options: TaskOption[];
  /** The ids currently chosen as blockers. */
  selected: string[];
  /**
   * The task being edited, excluded from the candidate list. Omitted when
   * creating a task (nothing can depend on a task that does not exist yet).
   */
  currentTaskId?: string;
  onChange: (ids: string[]) => void;
}

/**
 * A keyboard-friendly "blocked by" editor: a native `<select>` to add a blocker
 * and removable chips to drop one. Candidates already excluded are the task
 * itself, anything already chosen, and any task that would close a dependency
 * loop — so the UI cannot express a cycle (the repository rejects one anyway).
 */
export function BlockerPicker({ options, selected, currentTaskId, onChange }: BlockerPickerProps) {
  if (options.length === 0) return null;

  const byId = indexTasksById(options);
  const selectedSet = new Set(selected);
  const candidates = options.filter(
    (option) =>
      option.id !== currentTaskId &&
      !selectedSet.has(option.id) &&
      !wouldCreateDependencyCycle(currentTaskId ?? '', option.id, byId)
  );
  const selectedTasks = selected
    .map((id) => byId.get(id))
    .filter((task): task is TaskOption => Boolean(task));

  return (
    <div className={styles.field}>
      <span className={styles.label} id="blockers-label">
        Blocked by (optional)
      </span>

      <div className={styles.control} role="group" aria-labelledby="blockers-label">
        {selectedTasks.length === 0 ? (
          <p className={styles.empty}>Not blocked by anything.</p>
        ) : (
          <ul className={styles.chips}>
            {selectedTasks.map((task) => (
              <li key={task.id} className={styles.chip}>
                <span className={styles.chipLabel}>{task.title}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={styles.remove}
                  aria-label={`Remove blocker ${task.title}`}
                  onClick={() => onChange(selected.filter((id) => id !== task.id))}
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Select
          value=""
          onChange={(e) => {
            const value = e.target.value;
            if (value) onChange([...selected, value]);
          }}
          options={[
            {
              value: '',
              label: candidates.length > 0 ? 'Add a blocking task…' : 'No tasks available',
            },
            ...candidates.map((task) => ({ value: task.id, label: task.title })),
          ]}
          aria-label="Add a blocking task"
          disabled={candidates.length === 0}
        />
      </div>

      <p className={styles.hint}>A task cannot be started until everything blocking it is done.</p>
    </div>
  );
}
