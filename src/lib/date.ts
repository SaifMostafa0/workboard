import {
  addDays,
  differenceInDays,
  endOfDay,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

export const nowISO = (): string => new Date().toISOString();

export const parseDate = (dateString: string): Date | null => {
  const parsed = parseISO(dateString);
  return isValid(parsed) ? parsed : null;
};

export const formatDate = (dateString: string): string => {
  const date = parseDate(dateString);
  if (!date) return 'Invalid date';
  return format(date, 'MMM d, yyyy');
};

export const formatDateTime = (dateString: string): string => {
  const date = parseDate(dateString);
  if (!date) return 'Invalid date';
  return format(date, 'MMM d, yyyy h:mm a');
};

export const formatRelativeTime = (dateString: string): string => {
  const date = parseDate(dateString);
  if (!date) return 'Invalid date';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

export const isOverdue = (dueDate: string | undefined, referenceDate = new Date()): boolean => {
  if (!dueDate) return false;
  const due = parseDate(dueDate);
  if (!due) return false;
  const refStart = startOfDay(referenceDate);
  return due < refStart;
};

export const isDueToday = (dueDate: string | undefined, referenceDate = new Date()): boolean => {
  if (!dueDate) return false;
  const due = parseDate(dueDate);
  if (!due) return false;
  const refStart = startOfDay(referenceDate);
  const refEnd = endOfDay(referenceDate);
  return due >= refStart && due <= refEnd;
};

export const isDueSoon = (
  dueDate: string | undefined,
  days = 3,
  referenceDate = new Date()
): boolean => {
  if (!dueDate) return false;
  const due = parseDate(dueDate);
  if (!due) return false;
  const refStart = startOfDay(referenceDate);
  const soonEnd = endOfDay(addDays(referenceDate, days));
  return due > refStart && due <= soonEnd;
};

export const daysUntilDue = (dueDate: string | undefined, referenceDate = new Date()): number => {
  if (!dueDate) return Infinity;
  const due = parseDate(dueDate);
  if (!due) return Infinity;
  const refStart = startOfDay(referenceDate);
  return differenceInDays(due, refStart);
};

export const sortByDate = <T extends { createdAt: string }>(
  items: T[],
  direction: 'asc' | 'desc' = 'desc'
): T[] => {
  return [...items].sort((a, b) => {
    const dateA = parseDate(a.createdAt)?.getTime() ?? 0;
    const dateB = parseDate(b.createdAt)?.getTime() ?? 0;
    return direction === 'asc' ? dateA - dateB : dateB - dateA;
  });
};

export const sortByDueDate = <T extends { dueDate?: string }>(
  items: T[],
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...items].sort((a, b) => {
    const dateA = a.dueDate ? (parseDate(a.dueDate)?.getTime() ?? Infinity) : Infinity;
    const dateB = b.dueDate ? (parseDate(b.dueDate)?.getTime() ?? Infinity) : Infinity;
    if (dateA === Infinity && dateB === Infinity) return 0;
    if (dateA === Infinity) return 1;
    if (dateB === Infinity) return -1;
    return direction === 'asc' ? dateA - dateB : dateB - dateA;
  });
};
