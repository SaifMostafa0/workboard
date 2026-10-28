import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { RecurrenceFrequency, TaskRecurrence } from '@/domain/recurrence';
import {
  DEFAULT_RECURRENCE,
  MAX_RECURRENCE_INTERVAL,
  MIN_RECURRENCE_INTERVAL,
  RECURRENCE_FREQUENCIES,
  RECURRENCE_FREQUENCY_LABELS,
} from '@/domain/recurrence';
import styles from './RecurrenceFields.module.css';

interface RecurrenceFieldsProps {
  value?: TaskRecurrence;
  dueDate?: string;
  error?: string;
  onChange: (value: TaskRecurrence | undefined) => void;
}

export function RecurrenceFields({ value, dueDate, error, onChange }: RecurrenceFieldsProps) {
  const enabled = Boolean(value);
  const recurrence = value ?? DEFAULT_RECURRENCE;

  const update = (patch: Partial<TaskRecurrence>) => {
    onChange({ ...recurrence, ...patch });
  };

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Repeat</legend>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) =>
            onChange(event.target.checked ? { ...DEFAULT_RECURRENCE, until: undefined } : undefined)
          }
        />
        <span>Make this task recurring</span>
      </label>

      {enabled && (
        <>
          <div className={styles.row}>
            <Select
              label="Frequency"
              value={recurrence.frequency}
              onChange={(event) => update({ frequency: event.target.value as RecurrenceFrequency })}
              options={RECURRENCE_FREQUENCIES.map((frequency) => ({
                value: frequency,
                label: RECURRENCE_FREQUENCY_LABELS[frequency],
              }))}
            />
            <Input
              type="number"
              label="Every"
              min={MIN_RECURRENCE_INTERVAL}
              max={MAX_RECURRENCE_INTERVAL}
              value={recurrence.interval}
              onChange={(event) =>
                update({ interval: Number(event.target.value) || MIN_RECURRENCE_INTERVAL })
              }
              hint="Interval (1–99)"
            />
          </div>

          <Input
            type="date"
            label="Repeat until (optional)"
            value={recurrence.until ?? ''}
            min={dueDate}
            onChange={(event) =>
              update({ until: event.target.value === '' ? undefined : event.target.value })
            }
          />

          {!dueDate && (
            <p className={styles.hint}>Add a due date to anchor the first occurrence.</p>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
