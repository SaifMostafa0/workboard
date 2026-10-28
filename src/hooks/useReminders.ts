import type { ReminderCandidate } from '@/domain/reminder';
import { DEFAULT_REMINDER_LEAD_DAYS, getReminderCandidates } from '@/domain/reminder';
import { useEffect, useMemo, useState } from 'react';
import { useSettings, useTasks } from './useData';

const NOTIFIED_KEY = 'workboard:notified-reminders';
const NOTIFIED_RETENTION = 500;

const readNotifiedKeys = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(NOTIFIED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

const writeNotifiedKeys = (keys: string[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(keys.slice(-NOTIFIED_RETENTION)));
  } catch {
    // Notification bookkeeping is best-effort; private browsing may reject writes.
  }
};

/**
 * Derives reminders from the rendered task collection. The clock ticks once a
 * minute so a page left open across midnight still updates, without polling
 * storage or the network.
 */
export function useReminders(): {
  candidates: ReminderCandidate[];
  isLoading: boolean;
  now: Date;
  leadDays: number;
} {
  const { data: tasks, isLoading } = useTasks();
  const { data: settings } = useSettings();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const leadDays = settings?.reminderLeadDays ?? DEFAULT_REMINDER_LEAD_DAYS;
  const candidates = useMemo(
    () => getReminderCandidates(tasks ?? [], { leadDays, now }),
    [tasks, leadDays, now]
  );

  return { candidates, isLoading, now, leadDays };
}

export type NotificationPermissionState = 'granted' | 'denied' | 'unsupported';

/**
 * Requests browser notification permission. Permission denial is returned as a
 * value (not thrown) so settings can explain it inline and keep working with
 * the in-app reminder centre.
 */
export const requestNotificationPermission = async (): Promise<NotificationPermissionState> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
};

/**
 * Sends at most one browser notification per task/due-date/kind combination.
 * This is an in-app scheduler: notifications fire while Workboard is open or
 * installed. Background delivery is intentionally out of scope until the PWA
 * support ticket lands.
 */
export function useBrowserReminderNotifications(): void {
  const { candidates } = useReminders();
  const { data: settings } = useSettings();

  useEffect(() => {
    if (!settings?.browserNotificationsEnabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const notified = new Set(readNotifiedKeys());
    const fresh = candidates.filter((candidate) => !notified.has(candidate.key));
    const first = fresh[0];
    if (!first) return;

    for (const candidate of fresh) notified.add(candidate.key);
    writeNotifiedKeys([...notified]);

    const body =
      fresh.length === 1
        ? `${first.task.title} — ${first.kind === 'overdue' ? 'overdue' : `due ${first.dueDate}`}`
        : `${fresh.length} tasks need attention, starting with “${first.task.title}”.`;

    try {
      new Notification('Workboard reminders', {
        body,
        tag: 'workboard-reminders',
        icon: '/icons/icon-192.png',
      });
    } catch {
      // Some browsers expose Notification but disallow constructing it in this
      // context. The reminder centre remains the source of truth.
    }
  }, [candidates, settings?.browserNotificationsEnabled]);
}
