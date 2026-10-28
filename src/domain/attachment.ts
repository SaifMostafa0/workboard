export interface AttachmentMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

/** Per-file limit. Kept deliberately small for local-first storage. */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
/** Total limit for attachments on a single task. */
export const MAX_TASK_ATTACHMENT_BYTES = 25 * 1024 * 1024;
/** Total limit across all of a user's tasks. */
export const MAX_TOTAL_ATTACHMENT_BYTES = 100 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_TASK = 10;

export type AttachmentIssue =
  'attachment_too_large' | 'attachment_task_quota' | 'attachment_total_quota' | 'attachment_limit';

export const ATTACHMENT_ISSUE_MESSAGES: Record<AttachmentIssue, string> = {
  attachment_too_large: 'This file is larger than the 5 MB per-file limit',
  attachment_task_quota: 'This task has reached its 25 MB attachment limit',
  attachment_total_quota: 'Workboard has reached its 100 MB local attachment limit',
  attachment_limit: 'A task can hold at most 10 attachments',
};

export interface AttachmentCandidate {
  name: string;
  type: string;
  size: number;
}

const bytesFormatter = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });

export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${bytesFormatter.format(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${bytesFormatter.format(bytes / (1024 * 1024))} MB`;
  return `${bytesFormatter.format(bytes / (1024 * 1024 * 1024))} GB`;
};

/**
 * Keeps only a display/download-safe basename. Path separators, control
 * characters and Windows-reserved characters are replaced rather than allowing
 * a crafted filename to influence the download path.
 */
const stripControlCharacters = (value: string): string =>
  Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 0x20 && code !== 0x7f;
    })
    .join('');

export const sanitizeAttachmentName = (name: string): string => {
  const basename = name.split(/[/\\]/).pop() ?? '';
  const cleaned = stripControlCharacters(basename)
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'attachment').slice(0, 200);
};

export const totalAttachmentBytes = (
  attachments: ReadonlyArray<Pick<AttachmentMetadata, 'size'>>
): number => attachments.reduce((total, attachment) => total + attachment.size, 0);

/** Validates one candidate against the task's existing attachments. */
export const validateAttachment = (params: {
  candidate: AttachmentCandidate;
  existing: ReadonlyArray<AttachmentMetadata>;
  totalStoredBytes: number;
}): AttachmentIssue | null => {
  const { candidate, existing, totalStoredBytes } = params;
  if (candidate.size > MAX_ATTACHMENT_BYTES) return 'attachment_too_large';
  if (existing.length >= MAX_ATTACHMENTS_PER_TASK) return 'attachment_limit';
  if (totalAttachmentBytes(existing) + candidate.size > MAX_TASK_ATTACHMENT_BYTES) {
    return 'attachment_task_quota';
  }
  if (totalStoredBytes + candidate.size > MAX_TOTAL_ATTACHMENT_BYTES) {
    return 'attachment_total_quota';
  }
  return null;
};

/**
 * Attachment metadata is carried with the task so it can be exported, while
 * the blob itself stays in a dedicated local-only object store. Import/export
 * deliberately never contains blobs.
 */
export const isAttachmentMetadata = (value: unknown): value is AttachmentMetadata => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.size === 'number' &&
    Number.isFinite(candidate.size) &&
    candidate.size >= 0 &&
    typeof candidate.createdAt === 'string'
  );
};
