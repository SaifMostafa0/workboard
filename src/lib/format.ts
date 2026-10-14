export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  if (maxLength <= 1) return '…';
  const truncated = text.slice(0, maxLength - 1).trimEnd();
  // If we cut in the middle of a word, go back to the last space
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0 && lastSpace >= maxLength * 0.4) {
    return truncated.slice(0, lastSpace) + '…';
  }
  return truncated + '…';
};

export const capitalize = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const titleCase = (text: string): string => {
  return text
    .split(/[\s_-]+/)
    .map((word) => capitalize(word))
    .join(' ');
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const pluralize = (count: number, singular: string, plural?: string): string => {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || singular + 's'}`;
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export const joinWithConjunction = (items: string[], conjunction = 'and'): string => {
  const length = items.length;
  if (length === 0) return '';
  if (length === 1) return items[0]!;
  if (length === 2) return `${items[0]!} ${conjunction} ${items[1]!}`;
  const allButLast = items.slice(0, -1).join(', ');
  const last = items[length - 1]!;
  return `${allButLast}, ${conjunction} ${last}`;
};
