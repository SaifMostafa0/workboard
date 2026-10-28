import { describe, expect, it } from 'vitest';
import type { AttachmentMetadata } from '../attachment';
import {
  formatFileSize,
  isAttachmentMetadata,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_TASK,
  MAX_TASK_ATTACHMENT_BYTES,
  MAX_TOTAL_ATTACHMENT_BYTES,
  sanitizeAttachmentName,
  totalAttachmentBytes,
  validateAttachment,
} from '../attachment';

const metadata = (overrides: Partial<AttachmentMetadata> = {}): AttachmentMetadata => ({
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'notes.txt',
  type: 'text/plain',
  size: 10,
  createdAt: '2026-10-28T10:00:00.000Z',
  ...overrides,
});

describe('sanitizeAttachmentName', () => {
  it('keeps only the basename', () => {
    expect(sanitizeAttachmentName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeAttachmentName('C:\\Users\\seif\\report.pdf')).toBe('report.pdf');
  });

  it('strips control characters and replaces reserved characters', () => {
    expect(sanitizeAttachmentName('a\u0000b\u001fc\u007fd.txt')).toBe('abcd.txt');
    expect(sanitizeAttachmentName('a<b>c:d"e|f?g*h.txt')).toBe('a_b_c_d_e_f_g_h.txt');
  });

  it('collapses whitespace and trims', () => {
    expect(sanitizeAttachmentName('  my   file   name.pdf  ')).toBe('my file name.pdf');
  });

  it('falls back for empty names', () => {
    expect(sanitizeAttachmentName('')).toBe('attachment');
    expect(sanitizeAttachmentName('///')).toBe('attachment');
    expect(sanitizeAttachmentName('\u0000\u0001')).toBe('attachment');
  });

  it('truncates names to 200 characters', () => {
    expect(sanitizeAttachmentName('a'.repeat(300))).toHaveLength(200);
  });

  it('preserves unicode characters', () => {
    expect(sanitizeAttachmentName('résumé-日本語.pdf')).toBe('résumé-日本語.pdf');
  });
});

describe('formatFileSize', () => {
  it('formats bytes, kilobytes, megabytes and gigabytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2 GB');
  });

  it('handles invalid and negative sizes', () => {
    expect(formatFileSize(-1)).toBe('0 B');
    expect(formatFileSize(Number.NaN)).toBe('0 B');
    expect(formatFileSize(Number.POSITIVE_INFINITY)).toBe('0 B');
  });
});

describe('totalAttachmentBytes', () => {
  it('sums attachment sizes', () => {
    expect(totalAttachmentBytes([{ size: 10 }, { size: 32 }])).toBe(42);
    expect(totalAttachmentBytes([])).toBe(0);
  });
});

describe('validateAttachment', () => {
  const candidate = { name: 'file.txt', type: 'text/plain', size: 1024 };

  it('accepts a file within every limit', () => {
    expect(validateAttachment({ candidate, existing: [], totalStoredBytes: 0 })).toBeNull();
  });

  it('rejects files above the per-file limit', () => {
    expect(
      validateAttachment({
        candidate: { ...candidate, size: MAX_ATTACHMENT_BYTES + 1 },
        existing: [],
        totalStoredBytes: 0,
      })
    ).toBe('attachment_too_large');
  });

  it('rejects a task with the maximum number of attachments', () => {
    const existing = Array.from({ length: MAX_ATTACHMENTS_PER_TASK }, (_, index) =>
      metadata({ id: `123e4567-e89b-42d3-a456-4266141740${index.toString().padStart(2, '0')}` })
    );

    expect(validateAttachment({ candidate, existing, totalStoredBytes: 0 })).toBe(
      'attachment_limit'
    );
  });

  it('rejects files that exceed the per-task quota', () => {
    const existing = [metadata({ size: MAX_TASK_ATTACHMENT_BYTES })];
    const small = { ...candidate, size: 1 };

    expect(validateAttachment({ candidate: small, existing, totalStoredBytes: 0 })).toBe(
      'attachment_task_quota'
    );
  });

  it('rejects files that exceed the global quota', () => {
    expect(
      validateAttachment({
        candidate,
        existing: [],
        totalStoredBytes: MAX_TOTAL_ATTACHMENT_BYTES,
      })
    ).toBe('attachment_total_quota');
  });
});

describe('isAttachmentMetadata', () => {
  it('accepts valid metadata', () => {
    expect(isAttachmentMetadata(metadata())).toBe(true);
  });

  it('rejects malformed metadata', () => {
    expect(isAttachmentMetadata(null)).toBe(false);
    expect(isAttachmentMetadata({})).toBe(false);
    expect(isAttachmentMetadata({ ...metadata(), size: -1 })).toBe(false);
    expect(isAttachmentMetadata({ ...metadata(), size: 'large' })).toBe(false);
    expect(isAttachmentMetadata({ ...metadata(), name: 42 })).toBe(false);
  });
});
