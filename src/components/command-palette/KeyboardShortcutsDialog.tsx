import { Dialog } from '@/components/ui/Dialog';
import styles from './KeyboardShortcutsDialog.module.css';
import { SHORTCUTS } from './shortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="On macOS, use ⌘ in place of Ctrl."
      size="md"
    >
      <dl className={styles.list}>
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.description} className={styles.row}>
            <dt className={styles.keys}>
              {shortcut.keys.map((key) => (
                <kbd key={key} className={styles.kbd}>
                  {key}
                </kbd>
              ))}
            </dt>
            <dd className={styles.description}>{shortcut.description}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
