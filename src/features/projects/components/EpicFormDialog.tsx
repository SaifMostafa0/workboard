import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { EpicInputValidated } from '@/domain/validation';
import { epicInputSchema } from '@/domain/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import styles from './EpicFormDialog.module.css';

interface EpicFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  isLoading: boolean;
  onSubmit: (data: EpicInputValidated) => void;
  /** When set (with an `id`), the dialog edits instead of creating. */
  initialData?: Partial<EpicInputValidated> & { id?: string };
}

export function EpicFormDialog({
  open,
  onClose,
  projectId,
  isLoading,
  onSubmit,
  initialData,
}: EpicFormDialogProps) {
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EpicInputValidated>({
    resolver: zodResolver(epicInputSchema),
    defaultValues: {
      projectId,
      name: '',
      description: '',
    },
    mode: 'onChange',
  });

  // Re-seed the form each time the dialog opens so a previous edit (or a
  // cancelled creation) never leaks into the next one.
  useEffect(() => {
    if (!open) return;
    reset({
      projectId,
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
    });
  }, [open, projectId, initialData, reset]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Epic' : 'New Epic'}
      description={
        isEditing
          ? 'Update this epic and group tasks under it.'
          : 'Group related tasks and roll up their progress.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
        <Input
          {...register('name')}
          label="Name"
          placeholder="e.g. Authentication"
          required
          maxLength={100}
          error={errors.name?.message}
        />

        <Textarea
          {...register('description')}
          label="Description (optional)"
          placeholder="What does this epic cover?"
          maxLength={500}
          rows={3}
          error={errors.description?.message}
        />

        <div className={styles.actions}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting || isLoading}>
            {isEditing ? 'Save Changes' : 'Create Epic'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
