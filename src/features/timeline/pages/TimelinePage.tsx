import { EmptyState, Loading } from '@/components/feedback';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  parseCalendarDate,
  toCalendarDate,
  type Project,
  type Task,
  type TaskStatus,
} from '@/domain';
import { PROJECT_COLOR_HEX } from '@/domain/project';
import { TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from '@/domain/task';
import {
  TIMELINE_DEFAULT_ZOOM,
  TIMELINE_ZOOMS,
  TIMELINE_ZOOM_LABELS,
  buildTimelineModel,
  shiftTimelineAnchor,
  type TimelineTask,
  type TimelineZoom,
} from '@/domain/timeline';
import type { TaskInputValidated, TaskUpdateValidated } from '@/domain/validation';
import { TaskFormDialogWithData } from '@/features/tasks/components/TaskFormDialog';
import { useEpics, useProjects, useTaskSummary, useTasks, useUpdateTask } from '@/hooks/useData';
import { cn } from '@/lib/cn';
import { format } from 'date-fns';
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Plus,
  SquareChartGantt,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './TimelinePage.module.css';

const EMPTY_TASKS: Task[] = [];
const EMPTY_PROJECTS: Project[] = [];

const BAR_TOP = 8;
const BAR_LANE_HEIGHT = 42;

function TimelineBar({
  entry,
  projectColor,
  onOpen,
}: {
  entry: TimelineTask;
  projectColor: string;
  onOpen: (task: Task) => void;
}) {
  const { task, dueDate, percent, overdue } = entry;
  const due = parseCalendarDate(dueDate);

  const style = {
    '--project-color': projectColor,
    top: `${BAR_TOP + entry.lane * BAR_LANE_HEIGHT}px`,
  } as CSSProperties;

  // Keep bars inside the track near the edges while still anchoring them to
  // the due date: early tasks grow right from the date, late tasks grow left.
  if (percent < 18) {
    style.left = `${percent}%`;
  } else if (percent > 82) {
    style.right = `${100 - percent}%`;
  } else {
    style.left = `${percent}%`;
    style.transform = 'translateX(-50%)';
  }

  const summary = [
    task.title,
    `Due ${due ? format(due, 'MMMM d, yyyy') : dueDate}`,
    TASK_STATUS_LABELS[task.status],
    `${TASK_PRIORITY_LABELS[task.priority]} priority`,
    overdue ? 'Overdue' : null,
    task.status === 'done' ? 'Completed' : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <button
      type="button"
      className={cn(
        styles.bar,
        entry.overdue && styles.barOverdue,
        task.status === 'done' && styles.barDone
      )}
      style={style}
      onClick={() => onOpen(task)}
      aria-label={summary}
      title={summary}
      data-timeline-task-id={task.id}
      data-timeline-project-id={task.projectId}
      data-timeline-due-date={dueDate}
    >
      <span className={styles.barTitle}>{task.title}</span>
      <span className={styles.tooltip} aria-hidden="true">
        <strong>{task.title}</strong>
        <span>Due {due ? format(due, 'MMM d, yyyy') : dueDate}</span>
        <span>
          {TASK_STATUS_LABELS[task.status]} · {TASK_PRIORITY_LABELS[task.priority]} priority
        </span>
        {(overdue || task.status === 'done') && (
          <span className={styles.tooltipBadges}>
            {overdue && <span className={styles.overdueBadge}>Overdue</span>}
            {task.status === 'done' && <span className={styles.doneBadge}>Done</span>}
          </span>
        )}
      </span>
    </button>
  );
}

export function TimelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const today = useMemo(() => toCalendarDate(new Date()), []);
  const todayDate = parseCalendarDate(today) ?? new Date();

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: taskSummary } = useTaskSummary();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { data: epics } = useEpics(editingTask?.projectId);
  const updateTask = useUpdateTask();

  const zoomParam = searchParams.get('zoom');
  const zoom: TimelineZoom = TIMELINE_ZOOMS.includes(zoomParam as TimelineZoom)
    ? (zoomParam as TimelineZoom)
    : TIMELINE_DEFAULT_ZOOM;
  const parsedAnchor = parseCalendarDate(searchParams.get('date'));
  const anchor = toCalendarDate(parsedAnchor ?? todayDate);
  const projectFilter = searchParams.get('project') ?? '';
  const statusParam = searchParams.get('status');
  const statusFilter: TaskStatus | '' = TASK_STATUSES.includes(statusParam as TaskStatus)
    ? (statusParam as TaskStatus)
    : '';

  const model = buildTimelineModel(tasks ?? EMPTY_TASKS, projects ?? EMPTY_PROJECTS, {
    anchor,
    zoom,
    today,
    projectId: projectFilter || undefined,
    status: statusFilter || undefined,
  });

  const hasZoomParam = TIMELINE_ZOOMS.includes(zoomParam as TimelineZoom);
  const hasDateParam = parsedAnchor !== null;

  // Make the defaults shareable too: /timeline canonicalises to
  // /timeline?zoom=week&date=YYYY-MM-DD on first load.
  useEffect(() => {
    if (hasZoomParam && hasDateParam) return;

    const next = new URLSearchParams(searchParams);
    if (!hasZoomParam) next.set('zoom', zoom);
    if (!hasDateParam) next.set('date', anchor);
    setSearchParams(next, { replace: true });
  }, [anchor, hasDateParam, hasZoomParam, searchParams, setSearchParams, zoom]);

  const updateParams = (updates: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    setSearchParams(next, { replace });
  };

  const setZoom = (nextZoom: TimelineZoom) => updateParams({ zoom: nextZoom });

  const shiftRange = (direction: -1 | 1) => {
    updateParams({ date: shiftTimelineAnchor(anchor, zoom, direction) });
  };

  const goToToday = () => updateParams({ date: today });

  const openNewTask = () => {
    const query = projectFilter ? `&project=${encodeURIComponent(projectFilter)}` : '';
    navigate(`/tasks?new=1${query}`);
  };

  const handleEditTask = (data: TaskInputValidated | TaskUpdateValidated) => {
    if (!editingTask) return;

    updateTask.mutate(
      { id: editingTask.id, update: data },
      { onSuccess: () => setEditingTask(null) }
    );
  };

  const rangeStart = parseCalendarDate(model.range.start) ?? todayDate;
  const rangeEnd = parseCalendarDate(model.range.end) ?? todayDate;
  const rangeLabel =
    zoom === 'month'
      ? `${format(rangeStart, 'MMM yyyy')} – ${format(rangeEnd, 'MMM yyyy')}`
      : `${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')}`;

  const isLoading = tasksLoading || projectsLoading;
  const error = tasksError ?? projectsError;
  const hasTasks = (tasks?.length ?? 0) > 0;
  const todayDateLabel = format(todayDate, 'EEEE, MMMM d, yyyy');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Timeline</h1>
          <p className={styles.subtitle}>See how work lines up across projects and due dates.</p>
        </div>
        <Button variant="primary" onClick={openNewTask}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Task
        </Button>
      </header>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <Loading size="lg" label="Loading timeline..." />
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="w-10 h-10" />}
          title="Failed to load timeline"
          description={error.message ?? 'Something went wrong. Please try again.'}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      ) : !hasTasks ? (
        <EmptyState
          icon={<SquareChartGantt className="w-10 h-10" />}
          title="No tasks yet"
          description="Create a task with a due date and it will appear on the timeline."
          action={{ label: 'Create Task', onClick: openNewTask }}
        />
      ) : (
        <>
          <div className={styles.toolbar}>
            <div className={styles.rangeControls}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => shiftRange(-1)}
                aria-label="Previous window"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button variant="secondary" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => shiftRange(1)}
                aria-label="Next window"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>

              <h2 className={styles.rangeTitle} aria-live="polite">
                {rangeLabel}
              </h2>
            </div>

            <div className={styles.toolbarRight}>
              <div className={styles.zoomToggle} role="group" aria-label="Timeline zoom">
                {TIMELINE_ZOOMS.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={zoom === option ? 'primary' : 'ghost'}
                    aria-pressed={zoom === option}
                    onClick={() => setZoom(option)}
                  >
                    {TIMELINE_ZOOM_LABELS[option]}
                  </Button>
                ))}
              </div>

              <Select
                aria-label="Filter by project"
                className={styles.filterSelect}
                value={projectFilter}
                onChange={(event) => updateParams({ project: event.target.value || null })}
                options={[
                  { value: '', label: 'All projects' },
                  ...(projects ?? EMPTY_PROJECTS).map((project) => ({
                    value: project.id,
                    label: project.name,
                  })),
                ]}
              />

              <Select
                aria-label="Filter by status"
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(event) => updateParams({ status: event.target.value || null })}
                options={[
                  { value: '', label: 'All statuses' },
                  ...TASK_STATUSES.map((status) => ({
                    value: status,
                    label: TASK_STATUS_LABELS[status],
                  })),
                ]}
              />
            </div>
          </div>

          <p id="timeline-instructions" className="visuallyHidden">
            Today is {todayDateLabel}. Timeline rows group tasks by project. Each task bar is a
            button: press Enter or Space to edit the task. Use the zoom controls to change the time
            scale.
          </p>

          {model.datedTaskCount === 0 && (
            <div className={styles.notice} role="status">
              <CalendarClock className={styles.noticeIcon} aria-hidden="true" />
              <div>
                <p className={styles.noticeTitle}>No dated tasks in this window</p>
                <p className={styles.noticeText}>
                  Change the filters, navigate to another window, or add a due date to a task.
                </p>
              </div>
            </div>
          )}

          <div className={styles.board} aria-describedby="timeline-instructions">
            <div className={styles.boardScroll}>
              <div
                className={styles.boardInner}
                data-timeline-zoom={zoom}
                data-timeline-range-start={model.range.start}
                data-timeline-range-end={model.range.end}
              >
                <div className={styles.axisRow} aria-hidden="true">
                  <div className={styles.labelHeader}>Project</div>
                  <div className={styles.axis}>
                    {model.ticks.map((tick) => (
                      <div
                        key={tick.date}
                        className={styles.tick}
                        style={{
                          left: `${tick.startPercent}%`,
                          width: `${tick.widthPercent}%`,
                        }}
                      >
                        <span className={styles.tickLabel}>{tick.label}</span>
                        {tick.secondary && (
                          <span className={styles.tickSecondary}>{tick.secondary}</span>
                        )}
                      </div>
                    ))}
                    {model.todayPercent !== null && (
                      <div
                        className={styles.todayFlag}
                        style={{ left: `${model.todayPercent}%` }}
                        data-timeline-today={model.today}
                      >
                        Today
                      </div>
                    )}
                  </div>
                </div>

                {model.rows.map((row) => {
                  const projectName = row.project?.name ?? 'No project';
                  const color = row.project
                    ? PROJECT_COLOR_HEX[row.project.color]
                    : PROJECT_COLOR_HEX.blue;

                  return (
                    <section
                      key={row.project?.id ?? 'no-project'}
                      className={styles.row}
                      aria-label={`${projectName} timeline`}
                    >
                      <div className={styles.projectCell}>
                        <span
                          className={styles.projectDot}
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        {row.project ? (
                          <Link to={`/projects/${row.project.id}`} className={styles.projectName}>
                            {projectName}
                          </Link>
                        ) : (
                          <span className={styles.projectName}>{projectName}</span>
                        )}
                        <span className={styles.taskCount}>{row.tasks.length}</span>
                      </div>

                      <div
                        className={styles.track}
                        style={{
                          minHeight: `${Math.max(1, row.lanes) * BAR_LANE_HEIGHT + BAR_TOP * 2}px`,
                        }}
                      >
                        {model.ticks.map((tick) => (
                          <span
                            key={tick.date}
                            className={styles.gridLine}
                            style={{ left: `${tick.startPercent}%` }}
                            aria-hidden="true"
                          />
                        ))}

                        {model.todayPercent !== null && (
                          <span
                            className={styles.todayLine}
                            style={{ left: `${model.todayPercent}%` }}
                            aria-hidden="true"
                          />
                        )}

                        {row.tasks.length === 0 ? (
                          <p className={styles.emptyRow}>No tasks in this window</p>
                        ) : (
                          row.tasks.map((entry) => (
                            <TimelineBar
                              key={entry.task.id}
                              entry={entry}
                              projectColor={color}
                              onOpen={setEditingTask}
                            />
                          ))
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>

          {model.outOfRangeTasks.length > 0 && (
            <p className={styles.rangeNote}>
              {model.outOfRangeTasks.length} dated task
              {model.outOfRangeTasks.length === 1 ? ' is' : 's are'} outside this window. Navigate
              to another window or use a wider zoom to see them.
            </p>
          )}

          {model.undatedTasks.length > 0 && (
            <section className={styles.undatedPanel} aria-labelledby="timeline-undated-heading">
              <div className={styles.undatedHeader}>
                <h2 id="timeline-undated-heading" className={styles.undatedTitle}>
                  No due date
                </h2>
                <span className={styles.undatedCount}>{model.undatedTasks.length}</span>
              </div>
              <p className={styles.undatedText}>
                Tasks without a due date cannot be placed on the timeline.
              </p>
              <ul className={styles.undatedList}>
                {model.undatedTasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      className={styles.undatedButton}
                      onClick={() => setEditingTask(task)}
                      data-timeline-undated-task-id={task.id}
                    >
                      <span className={styles.undatedTaskTitle}>{task.title}</span>
                      <span className={styles.undatedTaskMeta}>
                        {TASK_STATUS_LABELS[task.status]} · {TASK_PRIORITY_LABELS[task.priority]}{' '}
                        priority
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <Link to="/tasks?due=no-date" className={styles.undatedLink}>
                Manage tasks without dates
              </Link>
            </section>
          )}

          {editingTask && (
            <TaskFormDialogWithData
              open={true}
              onClose={() => setEditingTask(null)}
              projectId={editingTask.projectId}
              initialData={{
                id: editingTask.id,
                title: editingTask.title,
                description: editingTask.description,
                status: editingTask.status,
                priority: editingTask.priority,
                dueDate: editingTask.dueDate,
                assignee: editingTask.assignee,
                tags: editingTask.tags,
                epicId: editingTask.epicId,
                blockedBy: editingTask.blockedBy ?? [],
              }}
              epics={epics}
              blockerOptions={taskSummary?.options ?? []}
              isLoading={updateTask.isPending}
              onSubmit={handleEditTask}
            />
          )}
        </>
      )}
    </div>
  );
}
