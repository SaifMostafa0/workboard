import { EmptyState, Loading } from '@/components/feedback';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  CALENDAR_WEEKDAY_LABELS,
  CALENDAR_WEEK_STARTS_ON,
  buildCalendarModel,
  groupTasksByProject,
  isTaskOverdue,
  parseCalendarDate,
  toCalendarDate,
  type CalendarViewMode,
} from '@/domain/calendar';
import { PROJECT_COLOR_HEX, type Project } from '@/domain/project';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type Task } from '@/domain/task';
import type { TaskInputValidated, TaskUpdateValidated } from '@/domain/validation';
import { TaskFormDialogWithData } from '@/features/tasks/components/TaskFormDialog';
import { useEpics, useProjects, useTaskSummary, useTasks, useUpdateTask } from '@/hooks/useData';
import { cn } from '@/lib/cn';
import { addDays, addMonths, format, startOfWeek } from 'date-fns';
import {
  AlertCircle,
  CalendarDays,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './CalendarPage.module.css';

const EMPTY_TASKS: Task[] = [];
const EMPTY_PROJECTS: Project[] = [];
const MONTH_CHIP_LIMIT = 3;
const UNDATED_PREVIEW_LIMIT = 5;

const RANGE_LABELS: Record<CalendarViewMode, string> = {
  month: 'month',
  week: 'week',
};

function CalendarTaskButton({
  task,
  today,
  onOpen,
}: {
  task: Task;
  today: string;
  onOpen: (task: Task) => void;
}) {
  const overdue = isTaskOverdue(task, today);

  return (
    <button
      type="button"
      className={cn(
        styles.taskButton,
        overdue && styles.taskButtonOverdue,
        task.status === 'done' && styles.taskButtonDone
      )}
      onClick={() => onOpen(task)}
    >
      <span className={styles.taskButtonTitle}>{task.title}</span>
      <span className={styles.taskButtonMeta}>
        <span>{TASK_STATUS_LABELS[task.status]}</span>
        <span aria-hidden="true">·</span>
        <span>{TASK_PRIORITY_LABELS[task.priority]}</span>
        {overdue && <span className={styles.overdueBadge}>Overdue</span>}
        {task.status === 'done' && <span className={styles.doneBadge}>Done</span>}
      </span>
    </button>
  );
}

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const today = useMemo(() => toCalendarDate(new Date()), []);

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: taskSummary } = useTaskSummary();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { data: epics } = useEpics(editingTask?.projectId);
  const updateTask = useUpdateTask();
  const pendingFocusRef = useRef<string | null>(null);

  const view: CalendarViewMode = searchParams.get('view') === 'week' ? 'week' : 'month';
  const todayDate = parseCalendarDate(today) ?? new Date();
  const anchorDate = parseCalendarDate(searchParams.get('date')) ?? todayDate;
  const anchor = toCalendarDate(anchorDate);
  const parsedDay = parseCalendarDate(searchParams.get('day'));
  const selectedDate = parsedDay ? toCalendarDate(parsedDay) : anchor;
  const selectedDateObject = parseCalendarDate(selectedDate) ?? anchorDate;
  const projectFilter = searchParams.get('project') ?? '';

  const visibleTasks = useMemo(() => {
    const source = tasks ?? EMPTY_TASKS;
    if (!projectFilter) return source;
    return source.filter((task) => task.projectId === projectFilter);
  }, [projectFilter, tasks]);

  const model = buildCalendarModel(visibleTasks, { anchor, view, today });

  const projectsById = useMemo(() => {
    return new Map((projects ?? EMPTY_PROJECTS).map((project) => [project.id, project] as const));
  }, [projects]);

  const selectedTasks = model.tasksByDate.get(selectedDate) ?? EMPTY_TASKS;
  const selectedGroups = groupTasksByProject(selectedTasks, projects ?? EMPTY_PROJECTS);
  const selectedOverdue = selectedTasks.filter((task) => isTaskOverdue(task, today)).length;
  const selectedDateInRange = model.days.some((day) => day.date === selectedDate);
  const rovingDate = selectedDateInRange ? selectedDate : anchor;

  const legendProjects = useMemo(() => {
    const taskProjectIds = new Set(visibleTasks.map((task) => task.projectId));
    return (projects ?? EMPTY_PROJECTS).filter((project) => taskProjectIds.has(project.id));
  }, [projects, visibleTasks]);

  const blockerOptions = taskSummary?.options ?? [];
  const hasDatedTasks = model.tasksByDate.size > 0;

  const hasViewParam = searchParams.get('view') === 'month' || searchParams.get('view') === 'week';
  const hasDateParam = parseCalendarDate(searchParams.get('date')) !== null;

  // Make the defaults shareable too: /calendar canonicalises to
  // /calendar?view=month&date=YYYY-MM-DD on first load.
  useEffect(() => {
    if (hasViewParam && hasDateParam) return;

    const next = new URLSearchParams(searchParams);
    if (!hasViewParam) next.set('view', view);
    if (!hasDateParam) next.set('date', anchor);
    setSearchParams(next, { replace: true });
  }, [anchor, hasDateParam, hasViewParam, searchParams, setSearchParams, view]);

  useEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) return;

    pendingFocusRef.current = null;
    const cell = document.querySelector<HTMLElement>(`[data-calendar-date="${pendingFocus}"]`);
    cell?.focus();
  }, [selectedDate]);

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

  const openNewTask = () => {
    const query = projectFilter ? `&project=${encodeURIComponent(projectFilter)}` : '';
    navigate(`/tasks?new=1${query}`);
  };

  const goToToday = () => updateParams({ date: today, day: today });

  const shiftRange = (direction: -1 | 1) => {
    const next =
      view === 'month' ? addMonths(anchorDate, direction) : addDays(anchorDate, direction * 7);
    updateParams({ date: toCalendarDate(next), day: toCalendarDate(next) });
  };

  const setView = (nextView: CalendarViewMode) => {
    // Keep the selected day visible when switching between a 42-day month grid
    // and a 7-day week, even if the day is in an adjacent month.
    updateParams({ view: nextView, date: selectedDate, day: selectedDate });
  };

  const selectDay = (date: string) => {
    updateParams({ day: date }, true);
  };

  const moveSelection = (nextDate: Date) => {
    const nextKey = toCalendarDate(nextDate);
    if (nextKey < model.rangeStart || nextKey > model.rangeEnd) {
      updateParams({ date: nextKey, day: nextKey });
    } else {
      updateParams({ day: nextKey }, true);
    }
    pendingFocusRef.current = nextKey;
  };

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>, date: string) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const current = parseCalendarDate(date);
    if (!current) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectDay(date);
      return;
    }

    let nextDate: Date | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        nextDate = addDays(current, -1);
        break;
      case 'ArrowRight':
        nextDate = addDays(current, 1);
        break;
      case 'ArrowUp':
        nextDate = addDays(current, -7);
        break;
      case 'ArrowDown':
        nextDate = addDays(current, 7);
        break;
      case 'Home':
        nextDate = startOfWeek(current, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
        break;
      case 'End':
        nextDate = addDays(startOfWeek(current, { weekStartsOn: CALENDAR_WEEK_STARTS_ON }), 6);
        break;
      case 'PageUp':
        nextDate = view === 'month' ? addMonths(current, -1) : addDays(current, -7);
        break;
      case 'PageDown':
        nextDate = view === 'month' ? addMonths(current, 1) : addDays(current, 7);
        break;
      default:
        return;
    }

    event.preventDefault();
    moveSelection(nextDate);
  };

  const handleCellClick = (event: MouseEvent<HTMLDivElement>, date: string) => {
    event.currentTarget.focus();
    selectDay(date);
  };

  const handleEditTask = (data: TaskInputValidated | TaskUpdateValidated) => {
    if (!editingTask) return;

    updateTask.mutate(
      { id: editingTask.id, update: data },
      { onSuccess: () => setEditingTask(null) }
    );
  };

  const isLoading = tasksLoading || projectsLoading;
  const error = tasksError ?? projectsError;
  const hasTasks = (tasks?.length ?? 0) > 0;
  const rangeLabel =
    view === 'month'
      ? format(anchorDate, 'MMMM yyyy')
      : `${format(parseCalendarDate(model.rangeStart) ?? anchorDate, 'MMM d')} - ${format(
          parseCalendarDate(model.rangeEnd) ?? anchorDate,
          'MMM d, yyyy'
        )}`;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Calendar</h1>
          <p className={styles.subtitle}>Plan work by due date, grouped by project.</p>
        </div>
        <Button variant="primary" onClick={openNewTask}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Task
        </Button>
      </header>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <Loading size="lg" label="Loading calendar..." />
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="w-10 h-10" />}
          title="Failed to load calendar"
          description={error.message ?? 'Something went wrong. Please try again.'}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      ) : !hasTasks ? (
        <EmptyState
          icon={<CalendarDays className="w-10 h-10" />}
          title="No tasks yet"
          description="Create a task with a due date and it will appear on the calendar."
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
                aria-label={`Previous ${RANGE_LABELS[view]}`}
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
                aria-label={`Next ${RANGE_LABELS[view]}`}
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>

              <h2 id="calendar-heading" className={styles.rangeTitle} aria-live="polite">
                {rangeLabel}
              </h2>
            </div>

            <div className={styles.toolbarRight}>
              <div className={styles.viewToggle} role="group" aria-label="Calendar view">
                <Button
                  size="sm"
                  variant={view === 'month' ? 'primary' : 'ghost'}
                  aria-pressed={view === 'month'}
                  onClick={() => setView('month')}
                >
                  Month
                </Button>
                <Button
                  size="sm"
                  variant={view === 'week' ? 'primary' : 'ghost'}
                  aria-pressed={view === 'week'}
                  onClick={() => setView('week')}
                >
                  Week
                </Button>
              </div>

              <Select
                aria-label="Filter by project"
                className={styles.projectSelect}
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
            </div>
          </div>

          {legendProjects.length > 0 && (
            <ul className={styles.legend} aria-label="Project colours">
              {legendProjects.map((project) => (
                <li key={project.id} className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{ backgroundColor: PROJECT_COLOR_HEX[project.color] }}
                    aria-hidden="true"
                  />
                  {project.name}
                </li>
              ))}
            </ul>
          )}

          {!hasDatedTasks && (
            <div className={styles.notice} role="status">
              <CalendarX className={styles.noticeIcon} aria-hidden="true" />
              <div>
                <p className={styles.noticeTitle}>No tasks with due dates</p>
                <p className={styles.noticeText}>
                  Add a due date to a task, or change the project filter, to see it on the calendar.
                </p>
              </div>
            </div>
          )}

          <p id="calendar-instructions" className="visuallyHidden">
            Use the arrow keys to move between days, Home and End to jump within a week, and Page Up
            or Page Down to change the range. Press Enter to select a day.
          </p>

          <div className={styles.layout}>
            <div className={styles.calendarPanel}>
              <div className={styles.gridScroll}>
                <div
                  role="grid"
                  aria-labelledby="calendar-heading"
                  aria-describedby="calendar-instructions"
                  className={cn(styles.grid, view === 'week' ? styles.weekGrid : styles.monthGrid)}
                >
                  <div role="row" className={styles.weekdayRow}>
                    {CALENDAR_WEEKDAY_LABELS.map((weekday) => (
                      <div
                        key={weekday.short}
                        role="columnheader"
                        aria-label={weekday.long}
                        className={styles.weekday}
                      >
                        {weekday.short}
                      </div>
                    ))}
                  </div>

                  {model.weeks.map((week) => (
                    <div key={week[0]?.date ?? 'week'} role="row" className={styles.weekRow}>
                      {week.map((day) => {
                        const date = parseCalendarDate(day.date);
                        const overdueCount = day.tasks.filter((task) =>
                          isTaskOverdue(task, today)
                        ).length;
                        const taskCount = day.tasks.length;
                        const taskSummaryText =
                          taskCount === 0
                            ? 'No tasks due'
                            : `${taskCount} task${taskCount === 1 ? '' : 's'} due`;
                        const overdueText = overdueCount > 0 ? `, ${overdueCount} overdue` : '';
                        const visibleChips =
                          view === 'week' ? day.tasks : day.tasks.slice(0, MONTH_CHIP_LIMIT);
                        const remaining = taskCount - visibleChips.length;

                        return (
                          <div
                            key={day.date}
                            role="gridcell"
                            tabIndex={rovingDate === day.date ? 0 : -1}
                            aria-selected={selectedDateInRange && selectedDate === day.date}
                            aria-current={day.isToday ? 'date' : undefined}
                            aria-label={`${
                              date ? format(date, 'EEEE, MMMM d, yyyy') : day.date
                            }. ${taskSummaryText}${overdueText}.`}
                            data-calendar-date={day.date}
                            className={cn(
                              styles.day,
                              view === 'week' && styles.dayWeek,
                              !day.inCurrentMonth && styles.dayOutsideMonth,
                              day.isWeekend && styles.dayWeekend,
                              day.isToday && styles.dayToday,
                              selectedDate === day.date && styles.daySelected
                            )}
                            onClick={(event) => handleCellClick(event, day.date)}
                            onKeyDown={(event) => handleGridKeyDown(event, day.date)}
                          >
                            <div className={styles.dayHeader}>
                              <span className={styles.dayNumber} aria-hidden="true">
                                {day.dayOfMonth}
                              </span>
                              {day.isToday && <span className={styles.todayLabel}>Today</span>}
                            </div>

                            <div className={styles.chips}>
                              {visibleChips.map((task) => {
                                const project = projectsById.get(task.projectId);
                                const color = PROJECT_COLOR_HEX[project?.color ?? 'blue'];
                                const overdue = isTaskOverdue(task, today);

                                return (
                                  <span
                                    key={task.id}
                                    className={cn(
                                      styles.taskChip,
                                      overdue && styles.taskChipOverdue,
                                      task.status === 'done' && styles.taskChipDone
                                    )}
                                    style={{ '--project-color': color } as CSSProperties}
                                    title={`${task.title}${
                                      project ? ` - ${project.name}` : ''
                                    }${overdue ? ' (overdue)' : ''}`}
                                  >
                                    <span className={styles.chipDot} aria-hidden="true" />
                                    <span className={styles.chipTitle}>{task.title}</span>
                                  </span>
                                );
                              })}
                              {remaining > 0 && (
                                <span className={styles.moreChip}>+{remaining} more</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className={styles.sidebar} aria-label="Calendar details">
              <section className={styles.panel} aria-labelledby="selected-day-heading">
                <div className={styles.panelHeader}>
                  <p className={styles.eyebrow}>Selected day</p>
                  <h2 id="selected-day-heading" className={styles.panelTitle}>
                    {format(selectedDateObject, 'EEEE, MMMM d, yyyy')}
                  </h2>
                  <p className={styles.panelMeta} aria-live="polite">
                    {selectedTasks.length === 0
                      ? 'No tasks due'
                      : `${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} due`}
                    {selectedOverdue > 0 && (
                      <span className={styles.overdueText}> · {selectedOverdue} overdue</span>
                    )}
                  </p>
                </div>

                {selectedGroups.length === 0 ? (
                  <div className={styles.panelEmpty} role="status">
                    <CalendarX className={styles.panelEmptyIcon} aria-hidden="true" />
                    <p>No tasks due on this day.</p>
                    <Button variant="ghost" size="sm" onClick={openNewTask}>
                      Add a task
                    </Button>
                  </div>
                ) : (
                  selectedGroups.map((group) => {
                    const groupName = group.project?.name ?? 'No project';
                    const color = group.project
                      ? PROJECT_COLOR_HEX[group.project.color]
                      : PROJECT_COLOR_HEX.blue;

                    return (
                      <section
                        key={group.project?.id ?? 'no-project'}
                        className={styles.group}
                        aria-label={`${groupName} tasks`}
                      >
                        <h3 className={styles.groupTitle}>
                          <span
                            className={styles.groupDot}
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          />
                          <span>{groupName}</span>
                          <span className={styles.groupCount}>{group.tasks.length}</span>
                        </h3>
                        <ul className={styles.taskList}>
                          {group.tasks.map((task) => (
                            <li key={task.id}>
                              <CalendarTaskButton
                                task={task}
                                today={today}
                                onOpen={setEditingTask}
                              />
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })
                )}
              </section>

              {model.undatedTasks.length > 0 && (
                <section className={styles.undatedPanel} aria-labelledby="undated-heading">
                  <h2 id="undated-heading" className={styles.panelTitle}>
                    No due date
                  </h2>
                  <p className={styles.panelMeta}>
                    {model.undatedTasks.length} task
                    {model.undatedTasks.length === 1 ? '' : 's'} without a due date
                    {projectFilter ? ' in this project' : ''} are not on the calendar.
                  </p>
                  <ul className={styles.taskList}>
                    {model.undatedTasks.slice(0, UNDATED_PREVIEW_LIMIT).map((task) => (
                      <li key={task.id}>
                        <CalendarTaskButton task={task} today={today} onOpen={setEditingTask} />
                      </li>
                    ))}
                  </ul>
                  <Link to="/tasks?due=no-date" className={styles.panelLink}>
                    Manage tasks without dates
                  </Link>
                </section>
              )}
            </aside>
          </div>

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
              blockerOptions={blockerOptions}
              isLoading={updateTask.isPending}
              onSubmit={handleEditTask}
            />
          )}
        </>
      )}
    </div>
  );
}
