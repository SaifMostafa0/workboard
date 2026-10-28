import { Button } from '@/components/ui/Button';
import type { AttachmentMetadata } from '@/domain/attachment';
import { formatFileSize } from '@/domain/attachment';
import { downloadTaskAttachment, useAddAttachment, useRemoveAttachment } from '@/hooks/useData';
import { Download, File, Paperclip, Trash2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import styles from './AttachmentsSection.module.css';

interface AttachmentsSectionProps {
  taskId: string;
  attachments: AttachmentMetadata[];
}

export function AttachmentsSection({ taskId, attachments }: AttachmentsSectionProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addAttachment = useAddAttachment(taskId);
  const removeAttachment = useRemoveAttachment(taskId);

  const addFiles = async (files: FileList | File[]) => {
    setError(null);
    for (const file of Array.from(files)) {
      try {
        await addAttachment.mutateAsync(file);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not add that file');
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) void addFiles(event.dataTransfer.files);
  };

  const handleDownload = async (attachment: AttachmentMetadata) => {
    setError(null);
    const result = await downloadTaskAttachment(taskId, attachment);
    if (!result.ok) setError(result.message);
  };

  return (
    <section className={styles.section} aria-labelledby={`${inputId}-heading`}>
      <div className={styles.headingRow}>
        <h4 id={`${inputId}-heading`} className={styles.heading}>
          <Paperclip className="w-4 h-4" aria-hidden="true" />
          Attachments
        </h4>
        <span className={styles.count}>{attachments.length} / 10</span>
      </div>

      <div
        className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
        data-testid="attachment-dropzone"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className={styles.fileInput}
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
          }}
        />
        <label htmlFor={inputId} className={styles.chooseLabel}>
          Choose files
        </label>
        <span className={styles.dropHint}>or drag and drop them here</span>
      </div>

      <p className={styles.localNote}>
        Files are stored only in this browser (5 MB per file, 25 MB per task). Exports and encrypted
        backups never include file contents.
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {attachments.length === 0 ? (
        <p className={styles.empty}>No files attached yet.</p>
      ) : (
        <ul className={styles.list}>
          {attachments.map((attachment) => (
            <li key={attachment.id} className={styles.item}>
              <File className="w-4 h-4" aria-hidden="true" />
              <span className={styles.name} title={attachment.name}>
                {attachment.name}
              </span>
              <span className={styles.size}>{formatFileSize(attachment.size)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleDownload(attachment)}
                aria-label={`Download ${attachment.name}`}
              >
                <Download className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAttachment.mutate(attachment)}
                disabled={removeAttachment.isPending}
                aria-label={`Remove ${attachment.name}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
