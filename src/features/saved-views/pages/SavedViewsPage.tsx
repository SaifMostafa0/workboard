import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import type { SavedView } from '@/domain/savedView';
import {
  useCreateSavedView,
  useDeleteSavedView,
  useSavedViews,
  useUpdateSavedView,
} from '@/hooks/useData';
import { useState } from 'react';

export function SavedViewsPage() {
  const { data: views } = useSavedViews();
  const create = useCreateSavedView();
  const update = useUpdateSavedView();
  const remove = useDeleteSavedView();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavedView | null>(null);
  const [name, setName] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editing) {
      update.mutate({ id: editing.id, update: { name } });
      setEditing(null);
    } else {
      create.mutate({ name, filters: {} });
    }
    setName('');
    setOpen(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Saved Views</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Named filter presets</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setName('');
            setOpen(true);
          }}
        >
          New View
        </Button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {views?.map((v) => (
          <div
            key={v.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
            }}
          >
            <span>{v.name}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(v);
                  setName(v.name);
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm('Delete saved view?')) remove.mutate(v.id);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit View' : 'New View'}>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="View name"
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
