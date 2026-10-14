import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import type { Label } from '@/domain/label';
import { useCreateLabel, useDeleteLabel, useLabels, useUpdateLabel } from '@/hooks/useData';
import { useState } from 'react';

export function LabelsPage() {
  const { data: labels } = useLabels();
  const create = useCreateLabel();
  const update = useUpdateLabel();
  const remove = useDeleteLabel();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Label | null>(null);
  const [name, setName] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editing) {
      update.mutate({ id: editing.id, update: { name } });
      setEditing(null);
    } else {
      create.mutate({ name });
    }
    setName('');
    setOpen(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Labels</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Manage tags/labels</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setName('');
            setOpen(true);
          }}
        >
          New Label
        </Button>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {labels?.map((l) => (
          <div
            key={l.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
            }}
          >
            <span>{l.name}</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(l);
                  setName(l.name);
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm('Delete label?')) remove.mutate(l.id);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Label' : 'New Label'}
      >
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Label name"
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
