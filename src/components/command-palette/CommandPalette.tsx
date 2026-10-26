import { useTheme } from '@/app/providers';
import { useSettings, useUpdateSettings } from '@/hooks/useData';
import { cn } from '@/lib/cn';
import {
  CalendarDays,
  ChartColumn,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Moon,
  Plus,
  Rows3,
  Search,
  Settings,
  SquareChartGantt,
  Sun,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styles from './CommandPalette.module.css';

interface Command {
  id: string;
  label: string;
  group: 'Navigation' | 'Actions';
  keywords?: string;
  icon: ReactNode;
  run: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
}

/**
 * ⌘/Ctrl+K command palette. Mounted only while open so its search/selection
 * state always starts fresh (avoiding a state-reset effect on open).
 */
export function CommandPalette({ onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings({ silent: true });

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => {
      onClose();
      navigate(path);
    };

    return [
      {
        id: 'nav-dashboard',
        group: 'Navigation',
        label: 'Go to Dashboard',
        keywords: 'home overview summary',
        icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" />,
        run: go('/'),
      },
      {
        id: 'nav-projects',
        group: 'Navigation',
        label: 'Go to Projects',
        keywords: 'boards folders',
        icon: <FolderKanban className="w-4 h-4" aria-hidden="true" />,
        run: go('/projects'),
      },
      {
        id: 'nav-tasks',
        group: 'Navigation',
        label: 'Go to Tasks',
        keywords: 'todo items',
        icon: <ListTodo className="w-4 h-4" aria-hidden="true" />,
        run: go('/tasks'),
      },
      {
        id: 'nav-calendar',
        group: 'Navigation',
        label: 'Go to Calendar',
        keywords: 'due dates schedule month week',
        icon: <CalendarDays className="w-4 h-4" aria-hidden="true" />,
        run: go('/calendar'),
      },
      {
        id: 'nav-timeline',
        group: 'Navigation',
        label: 'Go to Timeline',
        keywords: 'roadmap gantt plan dates',
        icon: <SquareChartGantt className="w-4 h-4" aria-hidden="true" />,
        run: go('/timeline'),
      },
      {
        id: 'nav-reports',
        group: 'Navigation',
        label: 'Go to Reports',
        keywords: 'analytics metrics insights throughput cycle time overdue trends',
        icon: <ChartColumn className="w-4 h-4" aria-hidden="true" />,
        run: go('/reports'),
      },
      {
        id: 'nav-trash',
        group: 'Navigation',
        label: 'Go to Trash',
        keywords: 'deleted restore bin',
        icon: <Trash2 className="w-4 h-4" aria-hidden="true" />,
        run: go('/trash'),
      },
      {
        id: 'nav-labels',
        group: 'Navigation',
        label: 'Go to Labels',
        keywords: 'tags labels',
        icon: <span>🏷</span>,
        run: go('/labels'),
      },
      {
        id: 'nav-saved-views',
        group: 'Navigation',
        label: 'Go to Saved Views',
        keywords: 'views filters saved',
        icon: <span>💾</span>,
        run: go('/saved-views'),
      },
      {
        id: 'nav-settings',
        group: 'Navigation',
        label: 'Go to Settings',
        keywords: 'preferences theme',
        icon: <Settings className="w-4 h-4" aria-hidden="true" />,
        run: go('/settings'),
      },
      {
        id: 'action-new-project',
        group: 'Actions',
        label: 'Create a new project',
        keywords: 'add project',
        icon: <Plus className="w-4 h-4" aria-hidden="true" />,
        run: go('/projects?new=1'),
      },
      {
        id: 'action-new-task',
        group: 'Actions',
        label: 'Create a new task',
        keywords: 'add task todo',
        icon: <Plus className="w-4 h-4" aria-hidden="true" />,
        run: go('/tasks?new=1'),
      },
      {
        id: 'action-toggle-theme',
        group: 'Actions',
        label: resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        keywords: 'dark light appearance',
        icon:
          resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4" aria-hidden="true" />
          ),
        run: () => {
          onClose();
          setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
        },
      },
      {
        id: 'action-toggle-compact',
        group: 'Actions',
        label: settings?.compactMode ? 'Turn off compact mode' : 'Turn on compact mode',
        keywords: 'density spacing layout',
        icon: <Rows3 className="w-4 h-4" aria-hidden="true" />,
        run: () => {
          onClose();
          updateSettings.mutate({ compactMode: !settings?.compactMode });
        },
      },
    ];
  }, [navigate, onClose, resolvedTheme, setTheme, settings?.compactMode, updateSettings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.keywords ?? ''}`.toLowerCase().includes(q)
    );
  }, [commands, query]);

  const safeIndex = filtered.length ? Math.min(activeIndex, filtered.length - 1) : 0;

  // Focus the input on mount and restore focus to the trigger on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => {
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Keep the highlighted option in view as the user arrows through results.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${safeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(filtered.length ? (safeIndex + 1) % filtered.length : 0);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(filtered.length ? (safeIndex - 1 + filtered.length) % filtered.length : 0);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      filtered[safeIndex]?.run();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const activeOptionId = filtered.length ? `${listId}-option-${safeIndex}` : undefined;

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.container}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className={styles.searchRow}>
          <Search className="w-5 h-5" aria-hidden="true" />
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            aria-label="Search commands"
            placeholder="Type a command or search…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
          />
        </div>

        <ul id={listId} ref={listRef} className={styles.list} role="listbox" aria-label="Commands">
          {filtered.map((command, index) => (
            <li
              key={command.id}
              id={`${listId}-option-${index}`}
              data-index={index}
              role="option"
              aria-selected={index === safeIndex}
              className={cn(styles.option, index === safeIndex && styles.optionActive)}
              onMouseMove={() => setActiveIndex(index)}
              onClick={command.run}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  command.run();
                }
              }}
            >
              <span className={styles.optionIcon}>{command.icon}</span>
              <span className={styles.optionLabel}>{command.label}</span>
              <span className={styles.optionGroup}>{command.group}</span>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <p className={styles.empty} role="status">
            No matching commands
          </p>
        )}

        <div className={styles.footer}>
          <span>
            <kbd className={styles.kbd}>↑</kbd>
            <kbd className={styles.kbd}>↓</kbd> navigate
          </span>
          <span>
            <kbd className={styles.kbd}>↵</kbd> select
          </span>
          <span>
            <kbd className={styles.kbd}>esc</kbd> close
          </span>
        </div>
      </div>
    </>,
    document.body
  );
}
