import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { describeActivity } from '@/domain/activity';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/domain/task';
import { useAddComment, useTask, useTaskActivity, useUpdateTask } from '@/hooks/useData';
import { formatDate, formatDateTime } from '@/lib/date';
import { MessageSquare, Repeat } from 'lucide-react';
import { useState } from 'react';
import { AttachmentsSection } from './AttachmentsSection';
import styles from './TaskDetailDialog.module.css';

interface TaskDetailDialogProps {
  open: boolean;
  taskId?: string;
  onClose: () => void;
}

export function TaskDetailDialog({ open, taskId, onClose }: TaskDetailDialogProps) {
  const { data: task, isLoading } = useTask(taskId ?? '');
  const { data: activity = [] } = useTaskActivity(taskId ?? '');
  const addComment = useAddComment(taskId ?? '');
  const updateTask = useUpdateTask();
  const [comment, setComment] = useState('');

  const comments = activity.filter((entry) => entry.kind === 'comment');
  const history = activity.filter((entry) => entry.kind !== 'comment');

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!taskId || !comment.trim()) return;
    try {
      await addComment.mutateAsync(comment);
      setComment('');
    } catch {
      // The mutation hook already surfaced the error in a toast.
    }
  };

  const stopRecurrence = async () => {
    if (!taskId) return;
    await updateTask.mutateAsync({ id: taskId, update: { recurrence: undefined } });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Task details" size="xl">
      {isLoading || !task ? (
        <p className={styles.loading}>Loading task…</p>
      ) : (
        <div className={styles.detail}>
          <header className={styles.header}>
            <div>
              <h3 className={styles.title}>{task.title}</h3>
              <div className={styles.badges}>
                <span className={styles.badge}>{TASK_STATUS_LABELS[task.status]}</span>
                <span className={styles.badge}>{TASK_PRIORITY_LABELS[task.priority]} priority</span>
                {task.dueDate && (
                  <span className={styles.badge}>Due {formatDate(task.dueDate)}</span>
                )}
                {task.assignee && <span className={styles.badge}>{task.assignee}</span>}
              </div>
            </div>
          </header>

          {task.description && <p className={styles.description}>{task.description}</p>}

          {task.recurrence && (
            <div className={styles.recurrenceRow}>
              <span className={styles.recurrenceText}>
                <Repeat className="w-4 h-4" aria-hidden="true" />
                Repeats {task.recurrence.frequency}, every {task.recurrence.interval}
                {task.recurrence.until ? ` until ${formatDate(task.recurrence.until)}` : ''}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void stopRecurrence()}
                disabled={updateTask.isPending}
              >
                Stop repeating
              </Button>
            </div>
          )}

          <section className={styles.section} aria-labelledby="comments-heading">
            <h4 id="comments-heading" className={styles.sectionTitle}>
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              Comments
            </h4>

            {comments.length === 0 ? (
              <p className={styles.empty}>No comments yet. Add the first one below.</p>
            ) : (
              <ol className={styles.commentList}>
                {comments.map((entry) => (
                  <li key={entry.id} className={styles.comment}>
                    <div className={styles.commentMeta}>
                      <strong>{entry.authorName ?? 'You'}</strong>
                      <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
                    </div>
                    <p className={styles.commentBody}>{entry.message}</p>
                  </li>
                ))}
              </ol>
            )}

            <form className={styles.commentForm} onSubmit={(event) => void submitComment(event)}>
              <Textarea
                label="Add a comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Share an update or decision…"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!comment.trim() || addComment.isPending}
                loading={addComment.isPending}
              >
                Post comment
              </Button>
            </form>
          </section>

          <section className={styles.section} aria-labelledby="history-heading">
            <h4 id="history-heading" className={styles.sectionTitle}>
              Activity
            </h4>
            {history.length === 0 ? (
              <p className={styles.empty}>No changes recorded yet.</p>
            ) : (
              <ol className={styles.activityList}>
                {history.map((entry) => (
                  <li key={entry.id} className={styles.activityItem}>
                    <span className={styles.activityText}>{describeActivity(entry)}</span>
                    <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <AttachmentsSection taskId={task.id} attachments={task.attachments ?? []} />
        </div>
      )}
    </Dialog>
  );
}
