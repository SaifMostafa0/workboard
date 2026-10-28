import { EmptyState, Loading } from '@/components/feedback';
import type { ReminderCandidate, ReminderKind } from '@/domain/reminder';
import { describeReminder } from '@/domain/reminder';
import { TASK_PRIORITY_LABELS } from '@/domain/task';
import { useProjects } from '@/hooks/useData';
import { useReminders } from '@/hooks/useReminders';
import { formatDate } from '@/lib/date';
import { AlertTriangle, Bell, CalendarClock, Settings2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './RemindersPage.module.css';

const GROUPS: Array<{
  kind: ReminderKind;
  title: string;
  description: string;
  icon: typeof AlertTriangle;
}> = [
  {
    kind: 'overdue',
    title: 'Overdue',
    description: 'Past their due date and still open',
    icon: AlertTriangle,
  },
  {
    kind: 'today',
    title: 'Due today',
    description: 'Finish these before the day is out',
    icon: Bell,
  },
  {
    kind: 'upcoming',
    title: 'Coming up',
    description: 'Inside your reminder lead time',
    icon: CalendarClock,
  },
];

export function RemindersPage() {
  const { candidates, isLoading, leadDays } = useReminders();
  const { data: projects } = useProjects();
  const navigate = useNavigate();

  const projectNames = new Map((projects ?? []).map((project) => [project.id, project.name]));
  const counts = {
    overdue: candidates.filter((candidate) => candidate.kind === 'overdue').length,
    today: candidates.filter((candidate) => candidate.kind === 'today').length,
    upcoming: candidates.filter((candidate) => candidate.kind === 'upcoming').length,
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Loading size="lg" label="Loading reminders..." />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Reminders</h1>
          <p className={styles.subtitle}>
            Open tasks that are overdue, due today, or due within {leadDays}{' '}
            {leadDays === 1 ? 'day' : 'days'}.
          </p>
        </div>
        <Link to="/settings" className={styles.settingsLink}>
          <Settings2 className="w-4 h-4" aria-hidden="true" />
          Reminder settings
        </Link>
      </header>

      <div className={styles.summary} aria-label="Reminder summary">
        {GROUPS.map((group) => (
          <div key={group.kind} className={styles.summaryCard}>
            <span className={styles.summaryValue}>{counts[group.kind]}</span>
            <span className={styles.summaryLabel}>{group.title}</span>
          </div>
        ))}
      </div>

      {candidates.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-10 h-10" />}
          title="You're all caught up"
          description={`No open tasks are due in the next ${leadDays} ${leadDays === 1 ? 'day' : 'days'}.`}
          action={{ label: 'View tasks', onClick: () => navigate('/tasks') }}
        />
      ) : (
        <div className={styles.groups}>
          {GROUPS.map((group) => {
            const items = candidates.filter((candidate) => candidate.kind === group.kind);
            if (items.length === 0) return null;
            const Icon = group.icon;
            return (
              <section
                key={group.kind}
                className={styles.group}
                aria-labelledby={`reminders-${group.kind}`}
              >
                <header className={styles.groupHeader}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <div>
                    <h2 id={`reminders-${group.kind}`} className={styles.groupTitle}>
                      {group.title}
                      <span className={styles.groupCount}>{items.length}</span>
                    </h2>
                    <p className={styles.groupDescription}>{group.description}</p>
                  </div>
                </header>
                <ul className={styles.list}>
                  {items.map((candidate) => (
                    <ReminderRow
                      key={candidate.key}
                      candidate={candidate}
                      projectName={projectNames.get(candidate.task.projectId)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReminderRow({
  candidate,
  projectName,
}: {
  candidate: ReminderCandidate;
  projectName?: string;
}) {
  const { task } = candidate;
  return (
    <li className={`${styles.item} ${styles[candidate.kind]}`}>
      <div className={styles.itemMain}>
        <Link to={`/tasks?task=${encodeURIComponent(task.id)}`} className={styles.itemTitle}>
          {task.title}
        </Link>
        <span className={styles.itemMeta}>
          {projectName ?? 'Unknown project'} · {TASK_PRIORITY_LABELS[task.priority]} priority
          {task.assignee ? ` · ${task.assignee}` : ''}
        </span>
      </div>
      <div className={styles.itemDue}>
        <span className={styles.reminderText}>{describeReminder(candidate)}</span>
        <time dateTime={candidate.dueDate}>{formatDate(candidate.dueDate)}</time>
      </div>
    </li>
  );
}
