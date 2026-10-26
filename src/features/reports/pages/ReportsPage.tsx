import { EmptyState, Loading } from '@/components/feedback';
import { Button } from '@/components/ui/Button';
import { parseCalendarDate } from '@/domain/calendar';
import { PROJECT_COLOR_HEX, type Project } from '@/domain/project';
import {
  DEFAULT_REPORT_WEEKS,
  REPORT_WEEK_OPTIONS,
  buildReportModel,
  normalizeReportWeeks,
  type ReportWeek,
  type ReportWeeks,
} from '@/domain/reporting';
import type { Task } from '@/domain/task';
import { useProjects, useTasks } from '@/hooks/useData';
import { cn } from '@/lib/cn';
import { format } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  ChartColumn,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './ReportsPage.module.css';

const EMPTY_TASKS: Task[] = [];
const EMPTY_PROJECTS: Project[] = [];

type ChartKind = 'throughput' | 'overdue';
type ChartValueKey = 'completed' | 'overdue';

function formatDays(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} d`;
}

function weekLabel(weekStart: string, pattern = 'MMM d'): string {
  const date = parseCalendarDate(weekStart);
  return date ? format(date, pattern) : weekStart;
}

function WeeklyChart({
  kind,
  title,
  description,
  buckets,
  valueKey,
  selectedWeekStart,
  onSelect,
}: {
  kind: ChartKind;
  title: string;
  description: string;
  buckets: ReportWeek[];
  valueKey: ChartValueKey;
  selectedWeekStart: string | null;
  onSelect: (weekStart: string) => void;
}) {
  const headingId = `report-${kind}-heading`;
  const max = Math.max(1, ...buckets.map((bucket) => bucket[valueKey]));
  const valueNoun = kind === 'throughput' ? 'tasks completed' : 'tasks overdue';

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardHeader}>
        <div>
          <h2 id={headingId} className={styles.cardTitle}>
            {title}
          </h2>
          <p className={styles.cardDescription}>{description}</p>
        </div>
        {kind === 'throughput' ? (
          <TrendingUp className={styles.cardIcon} aria-hidden="true" />
        ) : (
          <AlertTriangle className={styles.cardIcon} aria-hidden="true" />
        )}
      </div>

      <div
        className={styles.chartArea}
        role="group"
        aria-label={`${title} chart by week. Press Tab to inspect a week, or read the weekly data table below.`}
      >
        {buckets.map((bucket) => {
          const value = bucket[valueKey];
          const heightPercent = value === 0 ? 0 : Math.max(8, (value / max) * 100);
          const selected = selectedWeekStart === bucket.weekStart;

          return (
            <div className={styles.barColumn} key={bucket.weekStart}>
              <span className={styles.barValue} aria-hidden="true">
                {value}
              </span>
              <div className={styles.barTrack}>
                <button
                  type="button"
                  className={cn(
                    styles.barButton,
                    kind === 'overdue' && styles.barButtonOverdue,
                    selected && styles.barButtonSelected
                  )}
                  onClick={() => onSelect(bucket.weekStart)}
                  aria-pressed={selected}
                  aria-label={`Week of ${weekLabel(bucket.weekStart, 'MMMM d, yyyy')}: ${value} ${valueNoun}`}
                  data-report-chart={kind}
                  data-report-week-start={bucket.weekStart}
                >
                  <span
                    className={styles.barFill}
                    style={{ height: `${heightPercent}%` }}
                    aria-hidden="true"
                  />
                </button>
              </div>
              <span className={styles.barLabel} aria-hidden="true">
                {weekLabel(bucket.weekStart)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useMemo(() => new Date(), []);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();

  const weeksParam = searchParams.get('weeks');
  const weeks = normalizeReportWeeks(weeksParam);
  const hasCanonicalWeeks = weeksParam === String(weeks);

  const model = buildReportModel(tasks ?? EMPTY_TASKS, projects ?? EMPTY_PROJECTS, {
    weeks,
    now,
  });

  // Keep the default range shareable and make invalid values self-healing.
  useEffect(() => {
    if (hasCanonicalWeeks) return;

    const next = new URLSearchParams(searchParams);
    next.set('weeks', String(DEFAULT_REPORT_WEEKS));
    setSearchParams(next, { replace: true });
  }, [hasCanonicalWeeks, searchParams, setSearchParams]);

  const setWeeks = (nextWeeks: ReportWeeks) => {
    const next = new URLSearchParams(searchParams);
    next.set('weeks', String(nextWeeks));
    setSearchParams(next);
    setSelectedWeekStart(null);
  };

  const toggleWeek = (weekStart: string) => {
    setSelectedWeekStart((current) => (current === weekStart ? null : weekStart));
  };

  const isLoading = tasksLoading || projectsLoading;
  const error = tasksError ?? projectsError;
  const hasTasks = (tasks?.length ?? 0) > 0;
  const rangeStart = parseCalendarDate(model.rangeStart) ?? now;
  const rangeEnd = parseCalendarDate(model.rangeEnd) ?? now;
  const rangeLabel = `${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')}`;
  const selectedWeek = model.buckets.find((bucket) => bucket.weekStart === selectedWeekStart);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports</h1>
          <p className={styles.subtitle}>
            Reflect on throughput, cycle time and overdue work over time.
          </p>
          <p className={styles.privacy}>
            <ShieldCheck className={styles.privacyIcon} aria-hidden="true" />
            Computed locally from your task timestamps. Nothing leaves this device.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <Loading size="lg" label="Loading reports..." />
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="w-10 h-10" />}
          title="Failed to load reports"
          description={error.message ?? 'Something went wrong. Please try again.'}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      ) : !hasTasks ? (
        <EmptyState
          icon={<ChartColumn className="w-10 h-10" />}
          title="No data to report yet"
          description="Create and complete a few tasks, then come back to see your trends."
        />
      ) : (
        <>
          <div className={styles.toolbar}>
            <div>
              <p className={styles.toolbarLabel}>Reporting range</p>
              <h2 className={styles.rangeTitle} aria-live="polite">
                {rangeLabel}
              </h2>
              <p className={styles.rangeHelp}>
                {model.weeks} weeks · Sunday–Saturday · current week is partial
              </p>
            </div>

            <div className={styles.rangeToggle} role="group" aria-label="Report range">
              {REPORT_WEEK_OPTIONS.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={weeks === option ? 'primary' : 'ghost'}
                  aria-pressed={weeks === option}
                  onClick={() => setWeeks(option)}
                >
                  {option} weeks
                </Button>
              ))}
            </div>
          </div>

          <div
            className={styles.metrics}
            data-report-weeks={model.weeks}
            data-report-total-completed={model.totalCompleted}
            data-report-average-weekly={model.averageCompletedPerWeek}
            data-report-overdue-now={model.overdueNow}
            data-report-overall-cycle-days={model.overallAverageCycleDays ?? ''}
            data-report-range-start={model.rangeStart}
            data-report-range-end={model.rangeEnd}
          >
            <div className={cn(styles.metricCard, styles.metricSuccess)}>
              <div className={styles.metricIcon} aria-hidden="true">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className={styles.metricLabel}>Completed tasks</p>
                <p className={styles.metricValue}>{model.totalCompleted}</p>
                <p className={styles.metricDetail}>in the selected range</p>
              </div>
            </div>

            <div className={cn(styles.metricCard, styles.metricDefault)}>
              <div className={styles.metricIcon} aria-hidden="true">
                <ChartColumn className="w-5 h-5" />
              </div>
              <div>
                <p className={styles.metricLabel}>Average per week</p>
                <p className={styles.metricValue}>{model.averageCompletedPerWeek.toFixed(1)}</p>
                <p className={styles.metricDetail}>tasks completed</p>
              </div>
            </div>

            <div className={cn(styles.metricCard, styles.metricDefault)}>
              <div className={styles.metricIcon} aria-hidden="true">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <p className={styles.metricLabel}>Average cycle time</p>
                <p className={styles.metricValue}>{formatDays(model.overallAverageCycleDays)}</p>
                <p className={styles.metricDetail}>created → completed</p>
              </div>
            </div>

            <div className={cn(styles.metricCard, styles.metricDanger)}>
              <div className={styles.metricIcon} aria-hidden="true">
                <Clock3 className="w-5 h-5" />
              </div>
              <div>
                <p className={styles.metricLabel}>Overdue now</p>
                <p className={styles.metricValue}>{model.overdueNow}</p>
                <p className={styles.metricDetail}>open tasks past due</p>
              </div>
            </div>
          </div>

          <div className={styles.charts}>
            <WeeklyChart
              kind="throughput"
              title="Throughput"
              description="Tasks completed per week"
              buckets={model.buckets}
              valueKey="completed"
              selectedWeekStart={selectedWeekStart}
              onSelect={toggleWeek}
            />
            <WeeklyChart
              kind="overdue"
              title="Overdue trend"
              description="Open tasks past due at each week end"
              buckets={model.buckets}
              valueKey="overdue"
              selectedWeekStart={selectedWeekStart}
              onSelect={toggleWeek}
            />
          </div>

          {model.totalCompleted === 0 && (
            <p className={styles.emptyNote} role="status">
              No tasks were completed in this range. Try a longer range or complete a task.
            </p>
          )}

          {selectedWeek && (
            <p className={styles.weekDetail} role="status" data-report-week-detail>
              Week of {weekLabel(selectedWeek.weekStart, 'MMMM d, yyyy')}:{' '}
              <strong>{selectedWeek.completed}</strong> completed,{' '}
              <strong>{selectedWeek.overdue}</strong> overdue at week end.
            </p>
          )}

          <section className={styles.card} aria-labelledby="weekly-data-heading">
            <div className={styles.cardHeader}>
              <div>
                <h2 id="weekly-data-heading" className={styles.cardTitle}>
                  Weekly data
                </h2>
                <p className={styles.cardDescription}>
                  The same values as the charts, available as a table.
                </p>
              </div>
            </div>
            <div
              className={styles.tableWrap}
              role="region"
              aria-label="Weekly data table"
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The table scrolls horizontally on small screens.
              tabIndex={0}
            >
              <table className={styles.table}>
                <caption className="visuallyHidden">
                  Weekly completions and overdue counts for the selected range.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Week of</th>
                    <th scope="col" className={styles.numberCell}>
                      Completed
                    </th>
                    <th scope="col" className={styles.numberCell}>
                      Overdue at week end
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {model.buckets.map((bucket) => (
                    <tr
                      key={bucket.weekStart}
                      data-report-week-start={bucket.weekStart}
                      data-report-week-completed={bucket.completed}
                      data-report-week-overdue={bucket.overdue}
                    >
                      <th scope="row">
                        {weekLabel(bucket.weekStart, 'MMM d, yyyy')}
                        {bucket.weekEnd !== bucket.weekStart && (
                          <span className={styles.weekEndLabel}>
                            {' '}
                            – {weekLabel(bucket.weekEnd, 'MMM d')}
                          </span>
                        )}
                      </th>
                      <td className={styles.numberCell}>{bucket.completed}</td>
                      <td className={styles.numberCell}>{bucket.overdue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="cycle-time-heading">
            <div className={styles.cardHeader}>
              <div>
                <h2 id="cycle-time-heading" className={styles.cardTitle}>
                  Cycle time by project
                </h2>
                <p className={styles.cardDescription}>
                  Average elapsed time from created to completed for tasks completed in this range.
                </p>
              </div>
            </div>

            {model.cycleTimes.length === 0 ? (
              <p className={styles.emptyNote}>No projects to report yet.</p>
            ) : (
              <div
                className={styles.tableWrap}
                role="region"
                aria-label="Cycle time table"
                // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The table scrolls horizontally on small screens.
                tabIndex={0}
              >
                <table className={styles.table}>
                  <caption className="visuallyHidden">
                    Average cycle time and completed task count per project.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Project</th>
                      <th scope="col" className={styles.numberCell}>
                        Completed
                      </th>
                      <th scope="col" className={styles.numberCell}>
                        Average cycle time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.cycleTimes.map((row) => {
                      const projectName = row.project?.name ?? 'No project';
                      const color = row.project
                        ? PROJECT_COLOR_HEX[row.project.color]
                        : PROJECT_COLOR_HEX.blue;

                      return (
                        <tr
                          key={row.project?.id ?? 'no-project'}
                          data-report-project-id={row.project?.id ?? 'no-project'}
                          data-report-project-completed={row.completed}
                          data-report-project-average-cycle-days={row.averageDays ?? ''}
                        >
                          <th scope="row">
                            <span className={styles.projectName}>
                              <span
                                className={styles.projectDot}
                                style={{ backgroundColor: color }}
                                aria-hidden="true"
                              />
                              {projectName}
                            </span>
                          </th>
                          <td className={styles.numberCell}>{row.completed}</td>
                          <td className={styles.numberCell}>{formatDays(row.averageDays)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className={styles.footnote}>
            Completion dates come from <code>completedAt</code>; overdue snapshots use{' '}
            <code>dueDate</code> and completion history. Tasks without those timestamps are left out
            of the relevant metric.
          </p>
        </>
      )}
    </div>
  );
}
