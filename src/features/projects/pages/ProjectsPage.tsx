import { EmptyState, Loading } from '@/components/feedback';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Project } from '@/domain/project';
import { PROJECT_COLORS, PROJECT_COLOR_HEX, isValidProjectColor } from '@/domain/project';
import { safeValidateProjectInput } from '@/domain/validation';
import { useCreateProject, useDeleteProject, useProjects, useUpdateProject } from '@/hooks/useData';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { formatRelativeTime } from '@/lib/date';
import { AlertCircle, Edit, FolderKanban, Plus, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './ProjectsPage.module.css';

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNewRoute = location.pathname === '/projects/new';
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [dialogOpen, setDialogOpen] = useState(false);
  // The create dialog opens either explicitly (button/empty state) or via
  // `?new=1` / the `/projects/new` route. Deriving it from the URL avoids an
  // effect that mirrors route state into component state (and the cascading
  // render that causes).
  const wantsNewProject = isNewRoute || searchParams.get('new') === '1';
  const showCreateDialog = dialogOpen || wantsNewProject;
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Tracks whether the create/edit form has been touched, so navigating away
  // can prompt before discarding input.
  const [formDirty, setFormDirty] = useState(false);

  const { data: projects, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  useUnsavedChangesWarning((showCreateDialog || editingProject !== null) && formDirty);

  const clearNewProjectIntent = () => {
    if (isNewRoute) {
      navigate('/projects', { replace: true });
    } else if (searchParams.get('new') === '1') {
      const params = new URLSearchParams(searchParams);
      params.delete('new');
      setSearchParams(params, { replace: true });
    }
  };

  const closeCreateDialog = () => {
    setDialogOpen(false);
    setEditingProject(null);
    setFormError(null);
    setFormDirty(false);
    clearNewProjectIntent();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.delete('q');
    }
    setSearchParams(params);
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const colorValue = formData.get('color') as string;
    const color = isValidProjectColor(colorValue) ? colorValue : 'blue';

    const result = safeValidateProjectInput({ name, description, color });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Invalid project');
      return;
    }
    setFormError(null);

    createProject.mutate(result.data, {
      onSuccess: () => {
        setDialogOpen(false);
        form.reset();
        setFormDirty(false);
        clearNewProjectIntent();
      },
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProject) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const colorValue = formData.get('color') as string;
    const color = isValidProjectColor(colorValue) ? colorValue : editingProject.color;

    const result = safeValidateProjectInput({ name, description, color });
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Invalid project');
      return;
    }
    setFormError(null);

    updateProject.mutate(
      { id: editingProject.id, update: result.data },
      {
        onSuccess: () => {
          setEditingProject(null);
          setFormDirty(false);
        },
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Move "${name}" and its tasks to Trash?`)) {
      setDeletingId(id);
      deleteProject.mutate(id, {
        onSettled: () => setDeletingId(null),
      });
    }
  };

  // Filter projects based on search
  const filteredProjects =
    projects?.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loading size="lg" label="Loading projects..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <EmptyState
          icon={<AlertCircle className="w-10 h-10" />}
          title="Failed to load projects"
          description={error.message}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Projects</h1>
          <p className={styles.subtitle}>
            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Project
        </Button>
      </header>

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.searchInputWrapper}>
          <Search className={styles.searchIcon} aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search projects"
          />
        </div>
        {searchQuery && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
            Clear
          </Button>
        )}
      </form>

      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-10 h-10" />}
          title={searchQuery ? 'No projects found' : 'No projects yet'}
          description={
            searchQuery
              ? `No projects match "${searchQuery}". Try a different search term.`
              : 'Create your first project to start organizing tasks.'
          }
          action={{ label: 'Create Project', onClick: () => setDialogOpen(true) }}
        />
      ) : (
        <div className={styles.grid} role="list">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => setEditingProject(project)}
              onDelete={() => handleDelete(project.id, project.name)}
              isDeleting={deletingId === project.id}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog || editingProject !== null}
        project={editingProject ?? undefined}
        onClose={closeCreateDialog}
        isLoading={createProject.isPending || updateProject.isPending}
        nameError={formError}
        onDirty={() => setFormDirty(true)}
        onSubmit={editingProject ? handleEditSubmit : handleCreate}
      />
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function ProjectCard({ project, onEdit, onDelete, isDeleting }: ProjectCardProps) {
  const colorStyle = {
    '--project-color':
      PROJECT_COLOR_HEX[isValidProjectColor(project.color) ? project.color : 'blue'],
  } as React.CSSProperties;

  return (
    <article className={styles.card} role="listitem" style={colorStyle}>
      <Link to={`/projects/${project.id}`} className={styles.cardLink}>
        <div className={styles.cardHeader}>
          <div className={styles.colorIndicator} aria-hidden="true" />
          <div className={styles.cardInfo}>
            <h2 className={styles.cardTitle}>{project.name}</h2>
            {project.description && <p className={styles.cardDescription}>{project.description}</p>}
          </div>
        </div>
        <div className={styles.cardMeta}>
          <time dateTime={project.updatedAt} className={styles.metaItem}>
            Updated {formatRelativeTime(project.updatedAt)}
          </time>
        </div>
      </Link>
      <div className={styles.cardActions}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={isDeleting}
          aria-label={`Edit ${project.name}`}
        >
          <Edit className="w-4 h-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isDeleting}
          aria-label={`Delete ${project.name}`}
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

function CreateProjectDialog({
  open,
  project,
  onClose,
  isLoading,
  nameError,
  onDirty,
  onSubmit,
}: {
  open: boolean;
  project?: Project;
  onClose: () => void;
  isLoading: boolean;
  nameError?: string | null;
  onDirty: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;

  const isEdit = Boolean(project);
  const title = isEdit ? 'Edit Project' : 'Create Project';

  return (
    <div
      className={styles.dialogOverlay}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-dialog-title"
      >
        <header className={styles.dialogHeader}>
          <h2 id="project-dialog-title" className={styles.dialogTitle}>
            {title}
          </h2>
          <button className={styles.dialogClose} onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>
        <form onSubmit={onSubmit} className={styles.dialogForm} onInput={onDirty} noValidate>
          <Input
            name="name"
            label="Project Name"
            placeholder="Enter project name"
            defaultValue={project?.name}
            required
            maxLength={100}
            error={nameError ?? undefined}
          />
          <Input
            name="description"
            label="Description (optional)"
            placeholder="What's this project about?"
            defaultValue={project?.description}
            maxLength={500}
          />
          <div className={styles.colorPicker}>
            <span className={styles.colorPickerLabel}>Color</span>
            <div className={styles.colorOptions} role="radiogroup" aria-label="Project color">
              {PROJECT_COLORS.map((color) => (
                <label key={color} className={styles.colorOption}>
                  <input
                    type="radio"
                    name="color"
                    value={color}
                    aria-label={color}
                    defaultChecked={project ? project.color === color : color === 'blue'}
                    className={styles.colorRadio}
                  />
                  <span
                    className={styles.colorSwatch}
                    style={{ backgroundColor: PROJECT_COLOR_HEX[color] }}
                    aria-hidden="true"
                  />
                  <span className="srOnly">{color}</span>
                </label>
              ))}
            </div>
          </div>
          <div className={styles.dialogActions}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isLoading}>
              {isEdit ? 'Save Changes' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
