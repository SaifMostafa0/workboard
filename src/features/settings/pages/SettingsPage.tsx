import { useTheme } from '@/app/providers';
import { Alert } from '@/components/feedback/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { backlogToMarkdown, projectsToCsv, tasksToCsv } from '@/domain';
import {
  useClearAllData,
  useExportData,
  useImportData,
  useProjects,
  useSettings,
  useTasks,
  useUpdateSettings,
} from '@/hooks/useData';
import { cn } from '@/lib/cn';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Monitor,
  Moon,
  Palette,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import styles from './SettingsPage.module.css';

const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  pageSize: z.number().min(10).max(100),
  sidebarCollapsed: z.boolean(),
  showCompletedTasks: z.boolean(),
  compactMode: z.boolean(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

/** Download generated text without a round-trip through the server. */
function downloadTextFile(contents: string, filename: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking synchronously can cancel the download before the browser reads the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

const fileDateStamp = (): string => new Date().toISOString().slice(0, 10);

interface ExportNotice {
  title: string;
  message: string;
}

export function SettingsPage() {
  const { data: settings, isLoading, error } = useSettings();
  const { data: projects } = useProjects();
  const { data: tasks } = useTasks();
  const updateSettings = useUpdateSettings();
  const exportData = useExportData();
  const importData = useImportData();
  const clearAllData = useClearAllData();
  const { setTheme } = useTheme();

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importError, setImportError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<ExportNotice | null>(null);
  const exportDataReady = Boolean(projects && tasks);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: 'system',
      pageSize: 20,
      sidebarCollapsed: false,
      showCompletedTasks: true,
      compactMode: false,
    },
  });

  // Load persisted settings into the form once they arrive.
  useEffect(() => {
    if (!settings) return;
    reset({
      theme: settings.theme,
      pageSize: settings.pageSize,
      sidebarCollapsed: settings.sidebarCollapsed,
      showCompletedTasks: settings.showCompletedTasks,
      compactMode: settings.compactMode,
    });
  }, [settings, reset]);

  const theme = useWatch({ control, name: 'theme' });

  const handleSubmitSettings = (data: SettingsFormData) => {
    setTheme(data.theme);
    updateSettings.mutate(data);
  };

  const handleExport = () => {
    exportData.mutate(undefined, {
      onSuccess: () => {
        setExportNotice({
          title: 'Export complete',
          message: 'Your data has been downloaded as a JSON file.',
        });
      },
    });
  };

  const handleExportTasksCsv = () => {
    if (!tasks || !projects) return;
    downloadTextFile(
      tasksToCsv(tasks, projects),
      `workboard-tasks-${fileDateStamp()}.csv`,
      'text/csv;charset=utf-8'
    );
    setExportNotice({
      title: 'Tasks CSV exported',
      message: `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} downloaded as CSV.`,
    });
  };

  const handleExportProjectsCsv = () => {
    if (!projects) return;
    downloadTextFile(
      projectsToCsv(projects),
      `workboard-projects-${fileDateStamp()}.csv`,
      'text/csv;charset=utf-8'
    );
    setExportNotice({
      title: 'Projects CSV exported',
      message: `${projects.length} ${projects.length === 1 ? 'project' : 'projects'} downloaded as CSV.`,
    });
  };

  const handleExportBacklogMarkdown = () => {
    if (!tasks || !projects) return;
    downloadTextFile(
      backlogToMarkdown(tasks, projects),
      `workboard-backlog-${fileDateStamp()}.md`,
      'text/markdown;charset=utf-8'
    );
    setExportNotice({
      title: 'Backlog Markdown exported',
      message: `The current backlog (${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}) downloaded as Markdown.`,
    });
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        setImportError('File size must be less than 1MB');
        return;
      }
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setImportError('File must be a JSON file');
        return;
      }
      setImportFile(file);
      setImportError(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      importData.mutate(
        { data, mode: importMode },
        {
          onSuccess: () => {
            setImportDialogOpen(false);
            setImportFile(null);
            (document.getElementById('import-file') as HTMLInputElement)!.value = '';
          },
          onError: (err) => {
            setImportError(err.message);
          },
        }
      );
    } catch {
      setImportError('Invalid JSON file');
    }
  };

  const handleDeleteAll = () => {
    clearAllData.mutate(undefined, {
      onSuccess: () => setDeleteDialogOpen(false),
    });
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} aria-hidden="true" />
        <p>Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Alert type="error" title="Failed to load settings">
          {error.message || 'Something went wrong. Please try again.'}
        </Alert>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your preferences and data</p>
      </header>

      {exportNotice && (
        <Alert
          type="success"
          title={exportNotice.title}
          dismissible
          onDismiss={() => setExportNotice(null)}
        >
          {exportNotice.message}
        </Alert>
      )}

      <section className={styles.section} aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className={styles.sectionTitle}>
          <Palette className={styles.sectionIcon} aria-hidden="true" />
          Appearance
        </h2>

        <form onSubmit={handleSubmit(handleSubmitSettings)} className={styles.form}>
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Theme</span>
            <div className={styles.themeOptions} role="radiogroup" aria-label="Color theme">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <label
                  key={value}
                  className={cn(styles.themeOption, theme === value && styles.themeOptionActive)}
                >
                  <input
                    type="radio"
                    {...register('theme')}
                    value={value}
                    className={styles.themeRadio}
                  />
                  <div className={styles.themeOptionContent}>
                    <Icon className={styles.themeIcon} aria-hidden="true" />
                    <span>{label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="settings-page-size">
              Page Size
            </label>
            <Select
              id="settings-page-size"
              {...register('pageSize', { valueAsNumber: true })}
              options={[
                { value: '10', label: '10 per page' },
                { value: '20', label: '20 per page' },
                { value: '50', label: '50 per page' },
                { value: '100', label: '100 per page' },
              ]}
              error={errors.pageSize?.message}
            />
          </div>

          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Layout</span>
            <div className={styles.toggleGroup}>
              <label className={styles.toggle}>
                <input type="checkbox" {...register('sidebarCollapsed')} />
                <span className={styles.toggleSlider} />
                <span className={styles.toggleLabel}>Collapse sidebar by default</span>
              </label>
              <label className={styles.toggle}>
                <input type="checkbox" {...register('showCompletedTasks')} />
                <span className={styles.toggleSlider} />
                <span className={styles.toggleLabel}>Show completed tasks</span>
              </label>
              <label className={styles.toggle}>
                <input type="checkbox" {...register('compactMode')} />
                <span className={styles.toggleSlider} />
                <span className={styles.toggleLabel}>Compact mode</span>
              </label>
            </div>
          </div>

          <div className={styles.formActions}>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Save Settings
            </Button>
          </div>
        </form>
      </section>

      <section className={styles.section} aria-labelledby="data-heading">
        <h2 id="data-heading" className={styles.sectionTitle}>
          <Database className={styles.sectionIcon} aria-hidden="true" />
          Data Management
        </h2>

        <div className={styles.dataGrid}>
          <div className={styles.dataCard}>
            <div className={styles.dataCardHeader}>
              <FileJson className={styles.dataCardIcon} aria-hidden="true" />
              <div>
                <h3 className={styles.dataCardTitle}>Export Data</h3>
                <p className={styles.dataCardDesc}>
                  Download all your projects, tasks, labels and saved views as a JSON file
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleExport}
              loading={exportData.isPending}
              className={styles.dataCardButton}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export JSON
            </Button>
          </div>

          <div className={styles.dataCard}>
            <div className={styles.dataCardHeader}>
              <FileSpreadsheet className={styles.dataCardIcon} aria-hidden="true" />
              <div>
                <h3 className={styles.dataCardTitle}>Export Tasks CSV</h3>
                <p className={styles.dataCardDesc}>
                  Every active task with stable columns and RFC 4180 escaping, ready for a
                  spreadsheet
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleExportTasksCsv}
              disabled={!exportDataReady}
              className={styles.dataCardButton}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export Tasks CSV
            </Button>
          </div>

          <div className={styles.dataCard}>
            <div className={styles.dataCardHeader}>
              <FileSpreadsheet className={styles.dataCardIcon} aria-hidden="true" />
              <div>
                <h3 className={styles.dataCardTitle}>Export Projects CSV</h3>
                <p className={styles.dataCardDesc}>
                  The project list with colours and timestamps, for spreadsheets and reports
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleExportProjectsCsv}
              disabled={!exportDataReady}
              className={styles.dataCardButton}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export Projects CSV
            </Button>
          </div>

          <div className={styles.dataCard}>
            <div className={styles.dataCardHeader}>
              <FileText className={styles.dataCardIcon} aria-hidden="true" />
              <div>
                <h3 className={styles.dataCardTitle}>Export Backlog Markdown</h3>
                <p className={styles.dataCardDesc}>
                  The current backlog as a Markdown table, in the same shape as BACKLOG.md
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleExportBacklogMarkdown}
              disabled={!exportDataReady}
              className={styles.dataCardButton}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export Backlog Markdown
            </Button>
          </div>

          <div className={styles.dataCard}>
            <div className={styles.dataCardHeader}>
              <FileJson className={styles.dataCardIcon} aria-hidden="true" />
              <div>
                <h3 className={styles.dataCardTitle}>Import Data</h3>
                <p className={styles.dataCardDesc}>Restore from a previously exported JSON file</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              className={styles.dataCardButton}
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              Import JSON
            </Button>
          </div>

          <div className={cn(styles.dataCard, styles.danger)}>
            <div className={styles.dataCardHeader}>
              <Trash2 className={styles.dataCardIcon} aria-hidden="true" />
              <div>
                <h3 className={styles.dataCardTitle}>Danger Zone</h3>
                <p className={styles.dataCardDesc}>
                  Permanently delete all your data (cannot be undone)
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(true)}
              className={cn(styles.dataCardButton, styles.danger)}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Delete All Data
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="storage-heading">
        <h2 id="storage-heading" className={styles.sectionTitle}>
          <Database className={styles.sectionIcon} aria-hidden="true" />
          Storage Information
        </h2>
        <div className={styles.storageInfo}>
          <p>
            Your data is stored locally in your browser using <strong>IndexedDB</strong> (with
            localStorage fallback).
          </p>
          <p>This means:</p>
          <ul>
            <li>Data persists between browser sessions</li>
            <li>Data is not synced across devices or browsers</li>
            <li>Clearing browser data will delete your Workboard data</li>
            <li>Use Export/Import to backup or transfer data</li>
          </ul>
        </div>
      </section>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => {
          setImportDialogOpen(false);
          setImportError(null);
        }}
        title="Import Data"
        description="Select a JSON file exported from Workboard to restore your data."
        size="md"
      >
        <div className={styles.importDialog}>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={handleImportFileChange}
            hidden
          />
          <label htmlFor="import-file" className={styles.fileInputLabel}>
            <Upload className="w-5 h-5" aria-hidden="true" />
            <span>Choose JSON file</span>
            <span className={styles.fileInputHint}>Max 1MB, .json only</span>
          </label>

          {importFile && (
            <p className={styles.selectedFile}>
              Selected: <strong>{importFile.name}</strong> ({(importFile.size / 1024).toFixed(1)}{' '}
              KB)
            </p>
          )}

          {importError && (
            <Alert type="error" title="Import Error">
              {importError}
            </Alert>
          )}

          <div className={styles.importMode}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
              />
              <span>Merge</span>
              <span className={styles.radioDesc}>Add imported data, keep existing</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
              />
              <span>Replace</span>
              <span className={styles.radioDesc}>Delete existing data, use imported only</span>
            </label>
          </div>

          <div className={styles.dialogActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setImportDialogOpen(false);
                setImportError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!importFile || importData.isPending}
              loading={importData.isPending}
            >
              Import Data
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete All Data Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete All Data"
        description="This will permanently delete all your projects, tasks, labels, saved views, and preferences. This action cannot be undone."
        size="md"
      >
        <Alert type="error" title="This cannot be undone">
          Make sure you have exported a backup if you want to keep your data.
        </Alert>
        <div className={styles.dialogActions}>
          <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteAll} loading={clearAllData.isPending}>
            Delete Everything
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
