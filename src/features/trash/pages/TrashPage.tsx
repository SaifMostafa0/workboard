import { EmptyState } from '@/components/feedback/EmptyState';
import { Loading } from '@/components/feedback/Loading';
import { Button } from '@/components/ui/Button';
import {
  useEmptyTrash,
  usePurgeProject,
  usePurgeTask,
  useRestoreProject,
  useRestoreTask,
  useTrash,
} from '@/hooks/useData';
import { formatRelativeTime } from '@/lib/date';
import { RotateCcw, Trash2 } from 'lucide-react';
import styles from './TrashPage.module.css';

export function TrashPage() {
  const { data, isLoading } = useTrash();
  const restoreProject = useRestoreProject();
  const restoreTask = useRestoreTask();
  const purgeProject = usePurgeProject();
  const purgeTask = usePurgeTask();
  const emptyTrash = useEmptyTrash();

  const projects = data?.projects ?? [];
  const tasks = data?.tasks ?? [];
  const total = projects.length + tasks.length;

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loading size="lg" label="Loading trash..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Trash</h1>
          <p className={styles.subtitle}>
            {total === 0 ? 'Nothing here' : `${total} item${total === 1 ? '' : 's'} in trash`}
          </p>
        </div>
        {total > 0 && (
          <Button
            variant="danger"
            onClick={() => {
              if (
                window.confirm('Permanently delete everything in Trash? This cannot be undone.')
              ) {
                emptyTrash.mutate();
              }
            }}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Empty Trash
          </Button>
        )}
      </header>

      {total === 0 ? (
        <EmptyState
          icon={<Trash2 className="w-8 h-8" />}
          title="Trash is empty"
          description="Deleted projects and tasks land here so you can restore them or remove them for good."
        />
      ) : (
        <>
          {projects.length > 0 && (
            <section className={styles.section} aria-labelledby="trash-projects-heading">
              <h2 id="trash-projects-heading" className={styles.sectionTitle}>
                Projects ({projects.length})
              </h2>
              <ul className={styles.list}>
                {projects.map((project) => (
                  <li key={project.id} className={styles.item}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemTitle}>{project.name}</span>
                      <span className={styles.itemMeta}>
                        Deleted {project.deletedAt ? formatRelativeTime(project.deletedAt) : ''}
                      </span>
                    </div>
                    <div className={styles.itemActions}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => restoreProject.mutate(project.id)}
                      >
                        <RotateCcw className="w-4 h-4" aria-hidden="true" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm(`Permanently delete "${project.name}"?`)) {
                            purgeProject.mutate(project.id);
                          }
                        }}
                      >
                        Delete forever
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tasks.length > 0 && (
            <section className={styles.section} aria-labelledby="trash-tasks-heading">
              <h2 id="trash-tasks-heading" className={styles.sectionTitle}>
                Tasks ({tasks.length})
              </h2>
              <ul className={styles.list}>
                {tasks.map((task) => (
                  <li key={task.id} className={styles.item}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemTitle}>{task.title}</span>
                      <span className={styles.itemMeta}>
                        Deleted {task.deletedAt ? formatRelativeTime(task.deletedAt) : ''}
                      </span>
                    </div>
                    <div className={styles.itemActions}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => restoreTask.mutate(task.id)}
                      >
                        <RotateCcw className="w-4 h-4" aria-hidden="true" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm(`Permanently delete "${task.title}"?`)) {
                            purgeTask.mutate(task.id);
                          }
                        }}
                      >
                        Delete forever
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
