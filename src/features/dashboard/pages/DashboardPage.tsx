import { EmptyState, Loading } from '@/components/feedback';
import { Button } from '@/components/ui/Button';
import { useProjects, useTasks } from '@/hooks/useData';
import { cn } from '@/lib/cn';
import { formatRelativeTime, isOverdue } from '@/lib/date';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  FolderKanban,
  ListTodo,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks();

  const isLoading = projectsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loading size="lg" label="Loading dashboard..." />
      </div>
    );
  }

  if (projectsError || tasksError) {
    return (
      <div className={styles.emptyContainer}>
        <EmptyState
          icon={<AlertCircle className="w-10 h-10" />}
          title="Failed to load dashboard"
          description={
            (projectsError ?? tasksError)?.message ?? 'Something went wrong. Please try again.'
          }
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <EmptyState
          icon={<FolderKanban className="w-10 h-10" />}
          title="Welcome to Workboard"
          description="Create your first project to start organizing tasks and tracking progress."
          action={{
            label: 'Create Project',
            onClick: () => navigate('/projects/new'),
            variant: 'primary',
          }}
        />
      </div>
    );
  }

  // Calculate metrics
  const totalProjects = projects.length;
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t) => t.status === 'done').length || 0;
  const inProgressTasks = tasks?.filter((t) => t.status === 'in_progress').length || 0;
  const overdueTasks =
    tasks?.filter((t) => t.dueDate && isOverdue(t.dueDate) && t.status !== 'done').length || 0;

  // Upcoming due dates (next 7 days)
  const upcomingTasks =
    tasks
      ?.filter((t) => t.dueDate && !isOverdue(t.dueDate) && t.status !== 'done')
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
      .slice(0, 5) || [];

  // Recent activity (recently updated tasks)
  const recentTasks = [...(tasks ?? [])]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Overview of your projects and tasks</p>
      </header>

      {/* Metrics Grid */}
      <section className={styles.metrics} aria-label="Project metrics">
        <MetricCard
          icon={<FolderKanban className="w-5 h-5" />}
          label="Total Projects"
          value={totalProjects}
        />
        <MetricCard
          icon={<ListTodo className="w-5 h-5" />}
          label="Total Tasks"
          value={totalTasks}
          trend={
            totalTasks > 0
              ? `${Math.round((completedTasks / totalTasks) * 100)}% complete`
              : '0% complete'
          }
        />
        <MetricCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Completed"
          value={completedTasks}
          variant="success"
        />
        <MetricCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="In Progress"
          value={inProgressTasks}
          variant="warning"
        />
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="Overdue"
          value={overdueTasks}
          variant={overdueTasks > 0 ? 'danger' : 'default'}
        />
      </section>

      <div className={styles.grid}>
        {/* Upcoming Due Dates */}
        <section className={styles.card} aria-labelledby="upcoming-heading">
          <div className={styles.cardHeader}>
            <h2 id="upcoming-heading" className={styles.cardTitle}>
              <Clock className="w-5 h-5" aria-hidden="true" />
              Upcoming Due Dates
            </h2>
            <Link to="/tasks?due=upcoming" className={styles.viewAll}>
              View all <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className={styles.emptyText}>No upcoming due dates</p>
          ) : (
            <ul className={styles.taskList}>
              {upcomingTasks.map((task) => (
                <li key={task.id} className={styles.taskItem}>
                  <div className={styles.taskInfo}>
                    <Link to={`/projects/${task.projectId}`} className={styles.taskTitle}>
                      {task.title}
                    </Link>
                    <span className={styles.taskProject}>
                      {getProjectName(task.projectId, projects)}
                    </span>
                  </div>
                  <time className={styles.taskDate} dateTime={task.dueDate!}>
                    {formatRelativeTime(task.dueDate!)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Activity */}
        <section className={styles.card} aria-labelledby="recent-heading">
          <div className={styles.cardHeader}>
            <h2 id="recent-heading" className={styles.cardTitle}>
              <TrendingUp className="w-5 h-5" aria-hidden="true" />
              Recent Activity
            </h2>
            <Link to="/tasks?sort=updatedAt&order=desc" className={styles.viewAll}>
              View all <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <p className={styles.emptyText}>No recent activity</p>
          ) : (
            <ul className={styles.taskList}>
              {recentTasks.map((task) => (
                <li key={task.id} className={styles.taskItem}>
                  <div className={styles.taskInfo}>
                    <Link to={`/projects/${task.projectId}`} className={styles.taskTitle}>
                      {task.title}
                    </Link>
                    <span className={cn(styles.taskStatus, styles[`status-${task.status}`])}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                  <time className={styles.taskDate} dateTime={task.updatedAt}>
                    {formatRelativeTime(task.updatedAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Quick Actions */}
      <section className={styles.quickActions} aria-labelledby="actions-heading">
        <h2 id="actions-heading" className={styles.sectionTitle}>
          Quick Actions
        </h2>
        <div className={styles.actionButtons}>
          <Button asChild variant="primary" size="lg">
            <Link to="/projects/new">
              <Plus className="w-5 h-5" aria-hidden="true" />
              New Project
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/tasks/new">
              <Plus className="w-5 h-5" aria-hidden="true" />
              New Task
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  trend,
  trendLabel,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  trend?: string;
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: styles.metricDefault,
    success: styles.metricSuccess,
    warning: styles.metricWarning,
    danger: styles.metricDanger,
  };

  return (
    <article className={cn(styles.metricCard, variantStyles[variant])}>
      <div className={styles.metricIcon}>{icon}</div>
      <div className={styles.metricContent}>
        <p className={styles.metricLabel}>{label}</p>
        <p className={styles.metricValue}>{value}</p>
        {trend && (
          <div className={styles.metricTrend}>
            <span className={styles.trendValue}>{trend}</span>
            {trendLabel && <span className={styles.trendLabel}>{trendLabel}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

function getProjectName(projectId: string, projects: { id: string; name: string }[]) {
  const project = projects.find((p) => p.id === projectId);
  return project?.name || 'Unknown Project';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
  };
  return labels[status] || status;
}
