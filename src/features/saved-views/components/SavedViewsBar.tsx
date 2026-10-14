import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { SavedView } from '@/domain/savedView';
import { useCreateSavedView } from '@/hooks/useData';
import {
  hasActiveTaskFilters,
  taskFiltersToViewFilters,
  type TaskFilterState,
} from '@/lib/savedViewFilters';
import { Bookmark, Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import styles from './SavedViewsBar.module.css';

export interface SavedViewsBarProps {
  /** All saved views, already loaded by the parent. */
  views: SavedView[];
  activeViewId: string | null;
  currentFilters: TaskFilterState;
  onApply: (view: SavedView) => void;
  onSaved: (view: SavedView) => void;
  /** Return to the default (unfiltered) state, clearing any active view. */
  onClear: () => void;
}

/**
 * Applies and captures saved views on the Tasks page. Presentational apart from
 * creating a view; the parent owns the active view and the live filter state so
 * that applying a view stays a pure state transition.
 */
export function SavedViewsBar({
  views,
  activeViewId,
  currentFilters,
  onApply,
  onSaved,
  onClear,
}: SavedViewsBarProps) {
  const createView = useCreateSavedView();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const activeView = views.find((view) => view.id === activeViewId) ?? null;
  const canSave = hasActiveTaskFilters(currentFilters);

  const handleSelect = (id: string) => {
    if (!id) {
      onClear();
      return;
    }
    const view = views.find((item) => item.id === id);
    if (view) onApply(view);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createView.mutate(
      { name: trimmed, filters: taskFiltersToViewFilters(currentFilters) },
      {
        onSuccess: (view) => {
          onSaved(view);
          setOpen(false);
          setName('');
        },
      }
    );
  };

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="saved-view-select">
        View
      </label>
      <Select
        id="saved-view-select"
        aria-label="Apply a saved view"
        value={activeViewId ?? ''}
        onChange={(event) => handleSelect(event.target.value)}
        options={[
          { value: '', label: views.length > 0 ? 'All views' : 'No saved views yet' },
          ...views.map((view) => ({ value: view.id, label: view.name })),
        ]}
        className={styles.select}
      />

      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={!canSave}
        title={canSave ? undefined : 'Apply at least one filter before saving a view'}
      >
        <Save className="w-4 h-4" aria-hidden="true" />
        Save view
      </Button>

      {activeView && (
        <span className={styles.active} role="status">
          <Bookmark className="w-4 h-4" aria-hidden="true" />
          {activeView.name}
        </span>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Save current filters as a view">
        <form className={styles.form} onSubmit={handleSubmit}>
          <Input
            label="View name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. High priority work"
            required
            maxLength={100}
          />
          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createView.isPending} disabled={!name.trim()}>
              Save view
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
