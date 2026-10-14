import { EmptyState } from '@/components/feedback';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import type { SavedView } from '@/domain/savedView';
import {
  useCreateSavedView,
  useDeleteSavedView,
  useProjects,
  useSavedViews,
  useUpdateSavedView,
} from '@/hooks/useData';
import {
  describeViewFilters,
  taskFiltersToSearchParams,
  viewToTaskFilters,
} from '@/lib/savedViewFilters';
import { Bookmark, Play, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SavedViewsPage.module.css';

export function SavedViewsPage() {
  const { data: views } = useSavedViews();
  const { data: projects } = useProjects();
  const create = useCreateSavedView();
  const update = useUpdateSavedView();
  const remove = useDeleteSavedView();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavedView | null>(null);
  const [name, setName] = useState('');

  const projectOptions = projects?.map((project) => ({ id: project.id, name: project.name })) ?? [];

  const openCreate = () => {
    setEditing(null);
    setName('');
    setOpen(true);
  };

  const openEdit = (view: SavedView) => {
    setEditing(view);
    setName(view.name);
    setOpen(true);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editing) {
      update.mutate({ id: editing.id, update: { name: trimmed } });
    } else {
      create.mutate({ name: trimmed, filters: {} });
    }
    setEditing(null);
    setName('');
    setOpen(false);
  };

  /**
   * Applying a view is just a navigation: the Tasks page reads its filters from
   * the URL, so the resulting list is shareable, bookmarkable and reload-safe.
   */
  const applyView = (view: SavedView) => {
    const params = taskFiltersToSearchParams(viewToTaskFilters(view.filters));
    params.set('view', view.id);
    navigate(`/tasks?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Saved Views</h1>
          <p className={styles.subtitle}>
            Named filter presets. Apply one to jump to a pre-filtered task list.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          New View
        </Button>
      </header>

      {views && views.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="w-10 h-10" />}
          title="No saved views yet"
          description="Filter the task list, then choose “Save view” to keep the filters one click away."
          action={{ label: 'Go to Tasks', onClick: () => navigate('/tasks') }}
        />
      ) : (
        <ul className={styles.list}>
          {views?.map((view) => (
            <li key={view.id} className={styles.item}>
              <div className={styles.info}>
                <span className={styles.viewName}>{view.name}</span>
                <span className={styles.summary}>
                  {describeViewFilters(view.filters, projectOptions)}
                </span>
              </div>
              <div className={styles.actions}>
                <Button size="sm" onClick={() => applyView(view)}>
                  <Play className="w-4 h-4" aria-hidden="true" />
                  Apply
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(view)}>
                  Rename
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Delete “${view.name}”?`)) remove.mutate(view.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Rename view' : 'New view'}
        description={
          editing
            ? undefined
            : 'Start with a name; the filters are captured from the Tasks page when you save.'
        }
      >
        <form className={styles.form} onSubmit={onSubmit}>
          <Input
            label="View name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. High priority work"
            required
            maxLength={100}
          />
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={editing ? update.isPending : create.isPending}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
