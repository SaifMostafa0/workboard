import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STATUS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '@/domain/task';
import type { TaskInputValidated, TaskUpdateValidated } from '@/domain/validation';
import { taskInputSchema, taskUpdateSchema } from '@/domain/validation';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import styles from './TaskFormDialog.module.css';

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  taskId?: string;
  isLoading: boolean;
  onSubmit: (data: TaskInputValidated | TaskUpdateValidated) => void;
  /** When provided and creating (not editing), a project selector is shown. */
  projects?: Array<{ id: string; name: string }>;
  /** When set, the new task is created as a sub-task of this task. */
  parentId?: string;
  /** Display title of the parent task (for the sub-task context note). */
  parentTitle?: string;
}

export function TaskFormDialog({
  open,
  onClose,
  projectId,
  taskId,
  isLoading,
  onSubmit,
  projects,
  parentId,
  parentTitle,
}: TaskFormDialogProps) {
  const isEditing = !!taskId;
  const isSubtask = !isEditing && !!parentId;
  const schema = isEditing ? taskUpdateSchema : taskInputSchema;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaskInputValidated | TaskUpdateValidated>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId,
      title: '',
      description: '',
      status: DEFAULT_TASK_STATUS,
      priority: DEFAULT_TASK_PRIORITY,
      dueDate: undefined,
      assignee: '',
      tags: [] as string[],
      parentId,
    },
    mode: 'onChange',
  });

  // Handle tags as comma-separated string in input, but array in form data
  const tagsString = useWatch({ control, name: 'tags', defaultValue: [] }) as string[];
  const tagsInputValue = tagsString.join(', ');

  const handleTagsChange = (value: string) => {
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    setValue('tags', tags, { shouldValidate: true });
  };

  // Load task data when editing
  useEffect(() => {
    if (isEditing && taskId) {
      // In a real app, we'd fetch the task data here
      // For now, the form will be populated by the parent component
    }
  }, [isEditing, taskId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : isSubtask ? 'Create Sub-task' : 'Create Task'}
      description={
        isEditing
          ? 'Update the task details below.'
          : isSubtask
            ? 'Break this task into a smaller step.'
            : projectId
              ? 'Add a new task to this project.'
              : 'Choose a project and add a new task.'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {isSubtask && parentTitle && (
          <p className={styles.subtaskNote}>
            Sub-task of <strong>{parentTitle}</strong>
          </p>
        )}

        {!isEditing && projects && !isSubtask && (
          <Select
            {...register('projectId')}
            label="Project"
            options={[
              { value: '', label: 'Select a project' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
            error={errors.projectId?.message}
          />
        )}

        <Input
          {...register('title')}
          label="Title"
          placeholder="Enter task title"
          required
          maxLength={200}
          error={errors.title?.message}
        />

        <Textarea
          {...register('description')}
          label="Description (optional)"
          placeholder="Add details about this task"
          maxLength={2000}
          rows={4}
          error={errors.description?.message}
        />

        <div className={styles.row}>
          <Select
            {...register('status')}
            label="Status"
            options={TASK_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
            error={errors.status?.message}
          />
          <Select
            {...register('priority')}
            label="Priority"
            options={TASK_PRIORITIES.map((p) => ({ value: p, label: p }))}
            error={errors.priority?.message}
          />
        </div>

        <div className={styles.row}>
          <Input
            {...register('dueDate', {
              setValueAs: (value) => (value === '' ? undefined : value),
            })}
            type="date"
            label="Due Date (optional)"
            error={errors.dueDate?.message}
            min={new Date().toISOString().split('T')[0]}
          />
          <Input
            {...register('assignee')}
            label="Assignee (optional)"
            placeholder="Person responsible"
            maxLength={100}
            error={errors.assignee?.message}
          />
        </div>

        <div className={styles.tagsField}>
          <span className={styles.tagsLabel}>Tags (optional)</span>
          <Input
            name="tags"
            value={tagsInputValue}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="Comma-separated tags (e.g. frontend, bug, urgent)"
            maxLength={300}
            error={errors.tags?.message}
          />
          <p className={styles.tagsHint}>Separate tags with commas. Maximum 10 tags.</p>
        </div>

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
            {isEditing ? 'Save Changes' : isSubtask ? 'Create Sub-task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// Also export a version that can be pre-populated with task data
interface TaskFormDialogWithDataProps extends TaskFormDialogProps {
  initialData?: Partial<TaskInputValidated> & { id?: string };
}

export function TaskFormDialogWithData({
  open,
  onClose,
  projectId,
  initialData,
  isLoading,
  onSubmit,
}: TaskFormDialogWithDataProps) {
  const isEditing = !!initialData?.id;
  const schema = isEditing ? taskUpdateSchema : taskInputSchema;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TaskInputValidated | TaskUpdateValidated>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId,
      title: '',
      description: '',
      status: DEFAULT_TASK_STATUS,
      priority: DEFAULT_TASK_PRIORITY,
      dueDate: undefined,
      assignee: '',
      tags: [] as string[],
      ...initialData,
    },
    mode: 'onChange',
  });

  useUnsavedChangesWarning(open && isDirty);

  // Handle tags as comma-separated string in input, but array in form data
  const tagsString = useWatch({ control, name: 'tags', defaultValue: [] }) as string[];
  const tagsInputValue = tagsString.join(', ');

  const handleTagsChange = (value: string) => {
    const tags = value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    setValue('tags', tags, { shouldValidate: true });
  };

  // Populate the form with the selected task's data. This must only run when a
  // *different* task is opened: `initialData` is rebuilt on every parent render
  // (and React Query returns new objects on refetch), so keying the effect off
  // the object identity would wipe out edits that are in progress.
  const populatedTaskIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!open) {
      populatedTaskIdRef.current = undefined;
      return;
    }
    if (!initialData) return;
    if (populatedTaskIdRef.current === initialData.id) return;
    populatedTaskIdRef.current = initialData.id;

    Object.entries(initialData).forEach(([key, value]) => {
      if (key === 'tags' && Array.isArray(value)) {
        setValue('tags', value, { shouldValidate: true });
      } else if (
        key !== 'id' &&
        key !== 'projectId' &&
        key !== 'createdAt' &&
        key !== 'updatedAt' &&
        key !== 'completedAt'
      ) {
        setValue(key as never, value as never, { shouldValidate: true });
      }
    });
  }, [open, initialData, setValue]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : 'Create Task'}
      description={isEditing ? 'Update the task details below.' : 'Add a new task to this project.'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
        <Input
          {...register('title')}
          label="Title"
          placeholder="Enter task title"
          required
          maxLength={200}
          error={errors.title?.message}
        />

        <Textarea
          {...register('description')}
          label="Description (optional)"
          placeholder="Add details about this task"
          maxLength={2000}
          rows={4}
          error={errors.description?.message}
        />

        <div className={styles.row}>
          <Select
            {...register('status')}
            label="Status"
            options={TASK_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
            error={errors.status?.message}
          />
          <Select
            {...register('priority')}
            label="Priority"
            options={TASK_PRIORITIES.map((p) => ({ value: p, label: p }))}
            error={errors.priority?.message}
          />
        </div>

        <div className={styles.row}>
          <Input
            {...register('dueDate', {
              setValueAs: (value) => (value === '' ? undefined : value),
            })}
            type="date"
            label="Due Date (optional)"
            error={errors.dueDate?.message}
            min={new Date().toISOString().split('T')[0]}
          />
          <Input
            {...register('assignee')}
            label="Assignee (optional)"
            placeholder="Person responsible"
            maxLength={100}
            error={errors.assignee?.message}
          />
        </div>

        <div className={styles.tagsField}>
          <span className={styles.tagsLabel}>Tags (optional)</span>
          <Input
            name="tags"
            value={tagsInputValue}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="Comma-separated tags (e.g. frontend, bug, urgent)"
            maxLength={300}
            error={errors.tags?.message}
          />
          <p className={styles.tagsHint}>Separate tags with commas. Maximum 10 tags.</p>
        </div>

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
            {isEditing ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
