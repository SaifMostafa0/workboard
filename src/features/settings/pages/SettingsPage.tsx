import { useTheme } from '@/app/providers';
import { Alert } from '@/components/feedback/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import {
  useClearAllData,
  useExportData,
  useImportData,
  useResetDemoData,
  useSettings,
  useUpdateSettings,
} from '@/hooks/useData';
import { cn } from '@/lib/cn';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Database,
  Download,
  FileJson,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
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

export function SettingsPage() {
  const { data: settings, isLoading, error } = useSettings();
  const updateSettings = useUpdateSettings();
  const exportData = useExportData();
  const importData = useImportData();
  const resetDemoData = useResetDemoData();
  const clearAllData = useClearAllData();
  const { setTheme } = useTheme();

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importError, setImportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

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
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      },
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

  const handleReset = () => {
    resetDemoData.mutate(undefined, {
      onSuccess: () => setResetDialogOpen(false),
    });
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

      {exportSuccess && (
        <Alert
          type="success"
          title="Export Complete"
          dismissible
          onDismiss={() => setExportSuccess(false)}
        >
          Your data has been downloaded as a JSON file.
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
            <span className={styles.fieldLabel}>Page Size</span>
            <Select
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
                  Download all your projects and tasks as a JSON file
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
              <RotateCcw className={styles.dataCardIcon} aria-hidden="true" />
              <div>
                <h3 className={styles.dataCardTitle}>Reset to Demo</h3>
                <p className={styles.dataCardDesc}>
                  Clear all data and restore sample projects and tasks
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setResetDialogOpen(true)}
              className={cn(styles.dataCardButton, styles.danger)}
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reset Data
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

      {/* Reset Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        title="Reset to Demo Data"
        description="This will permanently delete all your projects and tasks and restore the sample data. This action cannot be undone."
        size="md"
      >
        <Alert type="warning" title="Warning">
          All your current data will be lost. Make sure you have exported a backup if you want to
          keep it.
        </Alert>
        <div className={styles.dialogActions}>
          <Button variant="secondary" onClick={() => setResetDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleReset} loading={resetDemoData.isPending}>
            Reset to Demo
          </Button>
        </div>
      </Dialog>

      {/* Delete All Data Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete All Data"
        description="This will permanently delete all your projects, tasks, and preferences. This action cannot be undone."
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
